import { clear, el } from "../../../shared/dom";
import { icon } from "../../../shared/icons";
import type { Store } from "../../../shared/store";
import { field, mButton, mNumber, mSegmented, mSlider } from "../../chessboard/panel/controls";
import { type ColorMode, type HilbertState, MAX_ORDER, MIN_ORDER } from "../state";

function setPlayContent(btn: HTMLButtonElement, playing: boolean, atEnd: boolean): void {
  const name = playing ? "pause" : atEnd ? "reset" : "play";
  const label = playing ? "Pause" : atEnd ? "Replay" : "Play";
  btn.replaceChildren(icon(name, 14), el("span", {}, [label]));
}

function sectionLabel(text: string): HTMLElement {
  return el("div", { className: "cb-section" }, [el("span", { className: "ds-label" }, [text])]);
}

// "64 × 64 grid · 4,096 points" — the curve's size for the current order.
function orderReadout(k: number): HTMLElement {
  const side = 1 << k;
  const n = 4 ** k;
  return el("div", { className: "hl-readout" }, [
    el("span", { className: "hl-readout-grid" }, [`${side} × ${side} grid`]),
    el("span", { className: "hl-readout-sep" }, ["·"]),
    el("span", { className: "hl-readout-n" }, [`${n.toLocaleString("en-US")} points`]),
  ]);
}

export function mountPanel(
  host: HTMLElement,
  store: Store<HilbertState>,
  onChange: () => void,
): void {
  let scrubEl: HTMLInputElement | null = null;
  let playBtn: HTMLButtonElement | null = null;
  let lastStructKey = "";

  // `k` and `colorMode` rebuild the panel (so the segmented control reflects its
  // selection — `mSegmented` only sets its active class on construction); neither
  // regenerates the path (it's memoized by `k`). Everything else live-syncs in place.
  const structKey = (s: HilbertState): string => JSON.stringify({ k: s.k, colorMode: s.colorMode });

  const syncLive = (s: HilbertState): void => {
    const n = 4 ** s.k;
    if (scrubEl && document.activeElement !== scrubEl) {
      scrubEl.max = String(n);
      scrubEl.value = String(Math.round(s.frame));
    }
    if (playBtn) setPlayContent(playBtn, s.playing, s.frame >= n);
  };

  const renderAll = (): void => {
    const s = store.get();
    const n = 4 ** s.k;
    clear(host);

    playBtn = mButton("Play", {
      icon: "play",
      variant: "primary",
      onClick: () => {
        const st = store.get();
        const atEnd = st.frame >= 4 ** st.k;
        if (atEnd && !st.playing) store.set({ frame: 0, playing: true });
        else store.set({ playing: !st.playing });
      },
    });
    const stepBtn = mButton("Step", {
      icon: "skip-forward",
      onClick: () => {
        const st = store.get();
        store.set({ playing: false, frame: Math.min(Math.floor(st.frame) + 1, 4 ** st.k) });
      },
    });

    scrubEl = mSlider({
      min: 0,
      max: n,
      value: Math.round(s.frame),
      onInput: (v) => store.set({ playing: false, frame: v }),
    });
    const speed = mSlider({
      min: 2,
      max: 120,
      value: s.speed,
      onInput: (v) => store.set({ speed: v }),
    });

    // Order is structural: changing k regenerates the path and rescales frame to
    // keep the same drawn fraction, so the order morph reads as an in-place refine.
    const order = mNumber({
      value: s.k,
      min: MIN_ORDER,
      max: MAX_ORDER,
      step: 1,
      onChange: (v) => {
        const st = store.get();
        const oldN = 4 ** st.k;
        const newN = 4 ** v;
        const frac = oldN > 0 ? st.frame / oldN : 0;
        store.set({ k: v, frame: Math.min(Math.round(frac * newN), newN) });
        onChange();
      },
    });

    const color = mSegmented<ColorMode>(
      [
        { value: "gradient", label: "Gradient" },
        { value: "solid", label: "Solid" },
      ],
      s.colorMode,
      (v) => store.set({ colorMode: v }),
    );

    host.append(
      sectionLabel("Parameters"),
      el("div", { className: "cb-playback" }, [playBtn, stepBtn]),
      field("Draw", scrubEl),
      field("Speed", speed),
      field("Order", order),
      orderReadout(s.k),
      field("Color", color),
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
