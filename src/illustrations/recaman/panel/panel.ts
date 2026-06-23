import { clear, el } from "../../../shared/dom";
import { icon } from "../../../shared/icons";
import type { Store } from "../../../shared/store";
import {
  field,
  mButton,
  mIconButton,
  mNumber,
  mSegmented,
  mSlider,
} from "../../chessboard/panel/controls";
import type { ColorMode, RecamanState } from "../state";

const MAX_TERMS = 100_000;

// Adaptive +/- step for the terms field: fine near the bottom, coarser as N grows.
function termsStep(value: number): number {
  if (value < 100) return 1;
  if (value < 1000) return 10;
  if (value < 10000) return 100;
  return 1000;
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
  store: Store<RecamanState>,
  onChange: () => void,
): void {
  let scrubEl: HTMLInputElement | null = null;
  let playBtn: HTMLButtonElement | null = null;
  let lastStructKey = "";

  const stepCount = (s: RecamanState): number => s.arcs.starts.length;

  // colorMode / alternate are structural for the *panel* only (so the segmented
  // pills repaint on click); they need no sequence recompute.
  const structKey = (s: RecamanState): string =>
    JSON.stringify({ terms: s.terms, colorMode: s.colorMode, alternate: s.alternate });

  const syncLive = (s: RecamanState): void => {
    const total = stepCount(s);
    if (scrubEl && document.activeElement !== scrubEl) {
      scrubEl.max = String(total);
      scrubEl.value = String(Math.round(s.frame));
    }
    if (playBtn) {
      const atEnd = total > 0 && s.frame >= total;
      setPlayContent(playBtn, s.playing, atEnd);
    }
  };

  const renderAll = (): void => {
    const s = store.get();
    const total = stepCount(s);
    clear(host);

    playBtn = mButton("Play", {
      icon: "play",
      variant: "primary",
      onClick: () => {
        const st = store.get();
        const atEnd = stepCount(st) > 0 && st.frame >= stepCount(st);
        if (atEnd && !st.playing) store.set({ frame: 0, playing: true });
        else store.set({ playing: !st.playing });
      },
    });
    const stepBtn = mIconButton("skip-forward", {
      title: "Step one term",
      onClick: () => {
        const st = store.get();
        store.set({ playing: false, frame: Math.min(Math.floor(st.frame) + 1, stepCount(st)) });
      },
    });

    scrubEl = mSlider({
      min: 0,
      max: total,
      value: Math.round(s.frame),
      onInput: (v) => store.set({ playing: false, frame: v }),
    });
    const speed = mSlider({
      min: 5,
      max: 500,
      value: s.speed,
      onInput: (v) => store.set({ speed: v }),
    });
    const terms = mNumber({
      value: s.terms,
      min: 1,
      max: MAX_TERMS,
      step: termsStep,
      onChange: (v) => {
        store.set({ terms: v });
        onChange();
      },
    });
    const colorMode = mSegmented<ColorMode>(
      [
        { value: "gradient", label: "Gradient" },
        { value: "accent", label: "Accent" },
      ],
      s.colorMode,
      (v) => store.set({ colorMode: v }),
    );
    const sides = mSegmented<"alt" | "all">(
      [
        { value: "alt", label: "Alternate" },
        { value: "all", label: "All above" },
      ],
      s.alternate ? "alt" : "all",
      (v) => store.set({ alternate: v === "alt" }),
    );

    host.append(
      sectionLabel("Parameters"),
      el("div", { className: "cb-playback" }, [playBtn, stepBtn]),
      field("Timeline", scrubEl),
      field("Speed", speed),
      field("Terms", terms),
      field("Color", colorMode),
      field("Sides", sides),
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
