import { clear, el } from "../../shared/dom";
import { icon } from "../../shared/icons";
import type { Store } from "../../shared/store";
// Reuse chessboard's Manifold-styled control builders verbatim.
import { field, mButton, mNumber, mSlider } from "../chessboard/panel/controls";
import type { CollatzState, ColorMode } from "./state";

const N_MAX = 50000;

// Adaptive +/- step for the seed count: fine near the bottom, coarser as it grows.
function nStep(value: number): number {
  if (value < 500) return 100;
  if (value < 2000) return 250;
  if (value < 5000) return 500;
  if (value < 20000) return 1000;
  return 5000;
}

function setPlayContent(btn: HTMLButtonElement, playing: boolean, atEnd: boolean): void {
  const name = playing ? "pause" : atEnd ? "reset" : "play";
  const label = playing ? "Pause" : atEnd ? "Replay" : "Play";
  btn.replaceChildren(icon(name, 14), el("span", {}, [label]));
}

function sectionLabel(text: string): HTMLElement {
  return el("div", { className: "cb-section" }, [el("span", { className: "ds-label" }, [text])]);
}

/** A labelled slider with a live numeric readout on the right of the label row. */
function readoutSlider(
  label: string,
  format: (v: number) => string,
  opts: { min: number; max: number; value: number; step: number; onInput: (v: number) => void },
): HTMLElement {
  const readout = el("span", { className: "co-readout" }, [format(opts.value)]);
  const slider = mSlider({
    min: opts.min,
    max: opts.max,
    value: opts.value,
    step: opts.step,
    onInput: (v) => {
      readout.textContent = format(v);
      opts.onInput(v);
    },
  });
  return el("div", { className: "cb-field" }, [
    el("div", { className: "cb-field-head" }, [
      el("span", { className: "cb-field-label ds-label" }, [label]),
      readout,
    ]),
    slider,
  ]);
}

export function mountPanel(
  host: HTMLElement,
  store: Store<CollatzState>,
  onChange: () => void,
): void {
  const s = store.get();
  clear(host);

  // ---- Playback ----
  const playBtn = mButton("Play", {
    icon: "play",
    variant: "primary",
    onClick: () => {
      const st = store.get();
      const atEnd = st.geom.maxDepth > 0 && st.frame >= st.geom.maxDepth;
      if (atEnd && !st.playing) store.set({ frame: 0, playing: true });
      else store.set({ playing: !st.playing });
    },
  });
  const stepBtn = mButton("Step", {
    icon: "skip-forward",
    onClick: () => {
      const st = store.get();
      store.set({ playing: false, frame: Math.min(Math.floor(st.frame) + 1, st.geom.maxDepth) });
    },
  });

  const scrub = mSlider({
    min: 0,
    max: s.geom.maxDepth,
    value: Math.round(s.frame),
    onInput: (v) => store.set({ playing: false, frame: v }),
  });
  const speed = mSlider({
    min: 2,
    max: 120,
    value: s.speed,
    onInput: (v) => store.set({ speed: v }),
  });

  // ---- Structural params (recompute geometry) ----
  const seeds = mNumber({
    value: s.n,
    min: 1,
    max: N_MAX,
    step: nStep,
    onChange: (v) => {
      store.set({ n: v });
      onChange();
    },
  });
  const thetaEven = readoutSlider("θ even", (v) => `${v.toFixed(1)}°`, {
    min: 0,
    max: 30,
    value: s.thetaEvenDeg,
    step: 0.5,
    onInput: (v) => {
      store.set({ thetaEvenDeg: v });
      onChange();
    },
  });
  const thetaOdd = readoutSlider("θ odd", (v) => `${v.toFixed(1)}°`, {
    min: 0,
    max: 30,
    value: s.thetaOddDeg,
    step: 0.5,
    onInput: (v) => {
      store.set({ thetaOddDeg: v });
      onChange();
    },
  });
  const lenVar = readoutSlider("Length variance", (v) => v.toFixed(2), {
    min: 0,
    max: 1,
    value: s.lenVar,
    step: 0.05,
    onInput: (v) => {
      store.set({ lenVar: v });
      onChange();
    },
  });

  // ---- Live params (no recompute) ----
  const opacity = readoutSlider("Stroke opacity", (v) => v.toFixed(2), {
    min: 0.02,
    max: 1,
    value: s.opacity,
    step: 0.01,
    onInput: (v) => store.set({ opacity: v }),
  });

  const modes: [ColorMode, string][] = [
    ["solid", "Solid"],
    ["depth-gradient", "Depth"],
  ];
  const colorSeg = el("div", { className: "cb-segmented" });
  const segButtons = new Map<ColorMode, HTMLElement>();
  for (const [value, label] of modes) {
    const btn = el(
      "button",
      { type: "button", className: `cb-segment${s.colorMode === value ? " is-active" : ""}` },
      [label],
    );
    btn.addEventListener("click", () => {
      store.set({ colorMode: value });
      for (const [v, b] of segButtons) b.classList.toggle("is-active", v === value);
    });
    segButtons.set(value, btn);
    colorSeg.append(btn);
  }

  host.append(
    sectionLabel("Parameters"),
    el("div", { className: "cb-playback" }, [playBtn, stepBtn]),
    field("Reveal", scrub),
    field("Speed", speed),
    field("N seeds", seeds),
    thetaEven,
    thetaOdd,
    lenVar,
    sectionLabel("Style"),
    opacity,
    field("Color", colorSeg),
  );

  // Live sync: only the bits that change every tick (reveal position + play state)
  // and after a rebuild (the reveal max). Everything else is owned by its control.
  store.subscribe((st) => {
    if (document.activeElement !== scrub) {
      scrub.max = String(st.geom.maxDepth);
      scrub.value = String(Math.round(st.frame));
    }
    const atEnd = st.geom.maxDepth > 0 && st.frame >= st.geom.maxDepth;
    setPlayContent(playBtn, st.playing, atEnd);
  });
  setPlayContent(playBtn, s.playing, false);
}
