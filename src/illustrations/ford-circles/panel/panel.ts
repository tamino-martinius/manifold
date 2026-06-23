import { clear, el } from "../../../shared/dom";
import { icon } from "../../../shared/icons";
import type { Store } from "../../../shared/store";
// Reuse the chessboard's Manifold control builders so the chrome is identical.
import { field, mButton, mNumber, mSegmented, mSlider } from "../../chessboard/panel/controls";
import type { ColorMode, FillMode, FordState } from "../state";

const MAX_ORDER = 3000;

// Adaptive +/- step for the order field: fine near the bottom, coarser as n grows.
function orderStep(v: number): number {
  return v < 50 ? 1 : v < 500 ? 10 : 100;
}

function setPlayContent(btn: HTMLButtonElement, playing: boolean, atEnd: boolean): void {
  const name = playing ? "pause" : atEnd ? "reset" : "play";
  const label = playing ? "Pause" : atEnd ? "Replay" : "Play";
  btn.replaceChildren(icon(name, 14), el("span", {}, [label]));
}

function sectionLabel(text: string, trailing?: string): HTMLElement {
  return el("div", { className: "cb-section" }, [
    el("span", { className: "ds-label" }, [text]),
    ...(trailing ? [el("span", { className: "ds-label cb-section-meta" }, [trailing])] : []),
  ]);
}

export function mountPanel(
  host: HTMLElement,
  store: Store<FordState>,
  // Called on a STRUCTURAL change (order / interval) → recompute the circle set.
  onChange: () => void,
): void {
  let scrubEl: HTMLInputElement | null = null;
  let playBtn: HTMLButtonElement | null = null;
  let lastStructKey = "";

  const structKey = (s: FordState): string =>
    JSON.stringify({
      order: s.order,
      a: s.intervalA,
      b: s.intervalB,
      colorMode: s.colorMode,
      fillMode: s.fillMode,
    });

  const syncLive = (s: FordState): void => {
    if (scrubEl && document.activeElement !== scrubEl) {
      scrubEl.max = String(s.order);
      scrubEl.value = String(Math.round(s.frame));
    }
    if (playBtn) setPlayContent(playBtn, s.playing, s.frame >= s.order);
  };

  const renderAll = (): void => {
    const s = store.get();
    clear(host);

    playBtn = mButton("Play", {
      icon: "play",
      variant: "primary",
      onClick: () => {
        const st = store.get();
        const atEnd = st.frame >= st.order;
        if (atEnd && !st.playing) store.set({ frame: 0, playing: true });
        else store.set({ playing: !st.playing });
      },
    });
    const stepBtn = mButton("Step", {
      icon: "skip-forward",
      onClick: () => {
        const st = store.get();
        store.set({ playing: false, frame: Math.min(Math.floor(st.frame) + 1, st.order) });
      },
    });

    scrubEl = mSlider({
      min: 0,
      max: s.order,
      value: Math.round(s.frame),
      onInput: (v) => store.set({ playing: false, frame: v }),
    });
    const speed = mSlider({
      min: 1,
      max: 40,
      value: s.speed,
      onInput: (v) => store.set({ speed: v }),
    });

    const order = mNumber({
      value: s.order,
      min: 1,
      max: MAX_ORDER,
      step: orderStep,
      onChange: (v) => {
        // Keep the reveal in range as the order shrinks.
        store.set({ order: v, frame: Math.min(store.get().frame, v) });
        onChange();
      },
    });

    const a = mNumber({
      value: s.intervalA,
      step: 1,
      onChange: (v) => {
        store.set({ intervalA: Math.min(v, store.get().intervalB - 1e-6) });
        onChange();
      },
    });
    const b = mNumber({
      value: s.intervalB,
      step: 1,
      onChange: (v) => {
        store.set({ intervalB: Math.max(v, store.get().intervalA + 1e-6) });
        onChange();
      },
    });
    const interval = el("div", { className: "fc-pair" }, [a, b]);

    const colorBy = mSegmented<ColorMode>(
      [
        { value: "denominator", label: "Denominator" },
        { value: "depth", label: "Depth" },
      ],
      s.colorMode,
      (v) => store.set({ colorMode: v }),
    );
    const style = mSegmented<FillMode>(
      [
        { value: "fill", label: "Fill" },
        { value: "outline", label: "Outline" },
      ],
      s.fillMode,
      (v) => store.set({ fillMode: v }),
    );

    host.append(
      sectionLabel("Parameters"),
      el("div", { className: "cb-playback" }, [playBtn, stepBtn]),
      field("Timeline", scrubEl),
      field("Speed", speed),
      field("Order n", order),
      field("Interval [a, b]", interval),
      field("Color by", colorBy),
      field("Style", style),
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
