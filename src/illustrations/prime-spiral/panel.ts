import { clear, el } from "../../shared/dom";
import { icon } from "../../shared/icons";
import type { Store } from "../../shared/store";
import { field, mButton, mNumber, mSegmented, mSlider } from "../chessboard/panel/controls";
import { COLOR_MOD_MARK, COLOR_MOD_MAX, COLOR_MOD_MIN, type PrimeSpiralState } from "./state";

const N_MIN = 100;
const N_MAX = 1_000_000;

// Adaptive +/- step for N: small near the bottom, coarser as it grows.
function nStep(value: number): number {
  if (value < 1000) return 100;
  if (value < 10000) return 1000;
  if (value < 100000) return 10000;
  return 50000;
}

function setPlayContent(btn: HTMLButtonElement, playing: boolean, atEnd: boolean): void {
  const name = playing ? "pause" : atEnd ? "reset" : "play";
  const label = playing ? "Pause" : atEnd ? "Replay" : "Play";
  btn.replaceChildren(icon(name, 14), el("span", {}, [label]));
}

function sectionLabel(text: string): HTMLElement {
  return el("div", { className: "cb-section" }, [el("span", { className: "ds-label" }, [text])]);
}

export function mountPanel(
  host: HTMLElement,
  store: Store<PrimeSpiralState>,
  onRecompute: () => void,
): void {
  let scrubEl: HTMLInputElement | null = null;
  let playBtn: HTMLButtonElement | null = null;
  let lastStructKey = "";

  const structKey = (s: PrimeSpiralState): string => JSON.stringify({ n: s.n });

  const syncLive = (s: PrimeSpiralState): void => {
    if (scrubEl && document.activeElement !== scrubEl) {
      scrubEl.max = String(Math.max(1, s.n));
      scrubEl.value = String(Math.round(s.frame));
    }
    if (playBtn) {
      const atEnd = s.data.n > 0 && s.frame >= s.data.n;
      setPlayContent(playBtn, s.playing, atEnd);
    }
  };

  const renderAll = (): void => {
    const s = store.get();
    clear(host);

    playBtn = mButton("Play", {
      icon: "play",
      variant: "primary",
      onClick: () => {
        const st = store.get();
        const atEnd = st.data.n > 0 && st.frame >= st.data.n;
        if (atEnd && !st.playing) store.set({ frame: 1, playing: true });
        else store.set({ playing: !st.playing });
      },
    });
    const stepBtn = mButton("Step", {
      icon: "skip-forward",
      onClick: () => {
        const st = store.get();
        store.set({ playing: false, frame: Math.min(Math.floor(st.frame) + 1, st.data.n) });
      },
    });

    scrubEl = mSlider({
      min: 1,
      max: Math.max(1, s.n),
      value: Math.round(s.frame),
      onInput: (v) => store.set({ playing: false, frame: v }),
    });
    const speed = mSlider({
      min: 2,
      max: 120,
      value: s.speed,
      onInput: (v) => store.set({ speed: v }),
    });
    const nField = mNumber({
      value: s.n,
      min: N_MIN,
      max: N_MAX,
      step: nStep,
      onChange: (v) => {
        store.set({ n: v });
        onRecompute();
      },
    });
    const points = mSegmented(
      [
        { value: "primes", label: "Primes only" },
        { value: "all", label: "All integers" },
      ],
      s.showAll ? "all" : "primes",
      (v) => store.set({ showAll: v === "all" }),
    );
    // Color-by-residue modulus: a slider (2..64) with a live readout and a tick
    // marking 44 — the 44/7 convergent of 2π where the arms famously resolve.
    const modValue = el("span", { className: "ps-mod-value" }, [String(s.colorMod)]);
    const modSlider = mSlider({
      min: COLOR_MOD_MIN,
      max: COLOR_MOD_MAX,
      value: s.colorMod,
      onInput: (v) => {
        store.set({ colorMod: v });
        modValue.textContent = String(v);
      },
    });
    const markPct = ((COLOR_MOD_MARK - COLOR_MOD_MIN) / (COLOR_MOD_MAX - COLOR_MOD_MIN)) * 100;
    const colorBy = el("div", { className: "cb-field" }, [
      el("div", { className: "cb-field-head" }, [
        el("span", { className: "cb-field-label ds-label" }, ["Color by mod"]),
        modValue,
      ]),
      el("div", { className: "ps-mod-slider" }, [
        modSlider,
        el("div", { className: "ps-mod-ticks" }, [
          el("span", { className: "ps-mod-tick", style: `left: ${markPct.toFixed(2)}%` }, [
            el("span", { className: "ps-mod-tick-label" }, [String(COLOR_MOD_MARK)]),
          ]),
        ]),
      ]),
    ]);
    const dotSize = mSlider({
      min: 0.5,
      max: 6,
      step: 0.1,
      value: s.dotScale,
      onInput: (v) => store.set({ dotScale: v }),
    });

    host.append(
      sectionLabel("Parameters"),
      el("div", { className: "cb-playback" }, [playBtn, stepBtn]),
      field("Reveal", scrubEl),
      field("Speed", speed),
      field("N (max integer)", nField),
      field("Points", points),
      colorBy,
      field("Dot size", dotSize),
    );

    lastStructKey = structKey(s);
    syncLive(s);
  };

  store.subscribe((s) => {
    if (structKey(s) !== lastStructKey) renderAll();
    else syncLive(s);
  });
  renderAll();
}
