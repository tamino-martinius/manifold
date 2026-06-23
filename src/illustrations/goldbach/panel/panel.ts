import { clear, el } from "../../../shared/dom";
import { icon } from "../../../shared/icons";
import type { Store } from "../../../shared/store";
import { field, mButton, mNumber, mSegmented, mSlider } from "../../chessboard/panel/controls";
import type { ColorBy, GoldbachState } from "../state";

const N_MIN = 100;
const N_MAX = 200_000;

// Adaptive +/- step for the N field: fine near the bottom, coarse up top.
function nStep(value: number): number {
  if (value < 1000) return 100;
  if (value < 50_000) return 5_000;
  return 20_000;
}

const COLOR_OPTIONS: { value: ColorBy; label: string }[] = [
  { value: "none", label: "None" },
  { value: "mod6", label: "mod 6" },
  { value: "div3", label: "3 | E" },
];

function setPlayContent(btn: HTMLButtonElement, playing: boolean, atEnd: boolean): void {
  const name = playing ? "pause" : atEnd ? "reset" : "play";
  const label = playing ? "Pause" : atEnd ? "Replay" : "Play";
  btn.replaceChildren(icon(name, 14), el("span", {}, [label]));
}

function sectionLabel(text: string): HTMLElement {
  return el("div", { className: "cb-section" }, [el("span", { className: "ds-label" }, [text])]);
}

// Reflect the active value on a segmented control in place (so non-structural
// switches don't need a full panel re-render).
function syncSegmented(root: HTMLElement, value: string, values: string[]): void {
  const buttons = root.querySelectorAll<HTMLElement>(".cb-segment");
  buttons.forEach((b, i) => b.classList.toggle("is-active", values[i] === value));
}

export function mountPanel(
  host: HTMLElement,
  store: Store<GoldbachState>,
  onChange: () => void,
): void {
  let scrubEl: HTMLInputElement | null = null;
  let playBtn: HTMLButtonElement | null = null;
  let lastStructKey = "";

  // Only N forces a recompute.
  const structKey = (s: GoldbachState): string => JSON.stringify({ N: s.N });

  const syncLive = (s: GoldbachState): void => {
    const count = s.data.E.length;
    if (scrubEl && document.activeElement !== scrubEl) {
      scrubEl.max = String(count);
      scrubEl.value = String(Math.round(s.frame));
    }
    if (playBtn) {
      const atEnd = count > 0 && s.frame >= count;
      setPlayContent(playBtn, s.playing, atEnd);
    }
  };

  const renderAll = (): void => {
    const s = store.get();
    clear(host);
    const count = s.data.E.length;

    playBtn = mButton("Play", {
      icon: "play",
      variant: "primary",
      onClick: () => {
        const st = store.get();
        const atEnd = st.data.E.length > 0 && st.frame >= st.data.E.length;
        if (atEnd && !st.playing) store.set({ frame: 0, playing: true });
        else store.set({ playing: !st.playing });
      },
    });
    const stepBtn = mButton("Step", {
      icon: "skip-forward",
      onClick: () => {
        const st = store.get();
        store.set({
          playing: false,
          frame: Math.min(Math.floor(st.frame) + 1, st.data.E.length),
        });
      },
    });

    scrubEl = mSlider({
      min: 0,
      max: count,
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
      value: s.N,
      min: N_MIN,
      max: N_MAX,
      step: nStep,
      onChange: (v) => {
        store.set({ N: v });
        onChange();
      },
    });

    const colorSeg = mSegmented<ColorBy>(COLOR_OPTIONS, s.colorBy, (v) => {
      store.set({ colorBy: v });
      syncSegmented(
        colorSeg,
        v,
        COLOR_OPTIONS.map((o) => o.value),
      );
    });

    const pointSize = mSlider({
      min: 0.5,
      max: 16.0,
      step: 0.1,
      value: s.pointSize,
      onInput: (v) => store.set({ pointSize: v }),
    });
    const pointAlpha = mSlider({
      min: 0.1,
      max: 1.0,
      step: 0.05,
      value: s.pointAlpha,
      onInput: (v) => store.set({ pointAlpha: v }),
    });

    host.append(
      sectionLabel("Parameters"),
      el("div", { className: "cb-playback" }, [playBtn, stepBtn]),
      field("Reveal", scrubEl),
      field("Speed", speed),
      sectionLabel("Comet"),
      field("N — max even number", nField),
      field("Color by band", colorSeg),
      field("Point size", pointSize),
      field("Point alpha", pointAlpha),
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
