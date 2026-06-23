import { clear, el } from "../../../shared/dom";
import { icon } from "../../../shared/icons";
import type { Store } from "../../../shared/store";
import { field, mButton, mNumber, mSlider } from "../../chessboard/panel/controls";
import type { HighlightMode } from "../sieve";
import type { UlamState } from "../state";

const N_CAP = 10_000_000;

// Adaptive +/- step for the max-integer field: fine near the bottom, coarse high up.
function nStep(value: number): number {
  if (value < 1000) return 100;
  if (value < 100_000) return 5_000;
  if (value < 2_000_000) return 100_000;
  return 1_000_000;
}

const MODE_OPTIONS: { value: HighlightMode; label: string }[] = [
  { value: "primes", label: "Primes" },
  { value: "twin", label: "Twin" },
  { value: "euler", label: "Euler" },
  { value: "custom", label: "Custom" },
  { value: "squares", label: "Squares" },
  { value: "triangular", label: "Triangular" },
];

// A faint caption describing what the active highlight set traces.
function modeCaption(s: UlamState): string {
  switch (s.mode) {
    case "primes":
      return "every prime — the base colour";
    case "twin":
      return "primes with a twin at p ± 2";
    case "euler":
      return "primes of n² + n + 41";
    case "custom": {
      const { a, b, c } = s.quad;
      return `primes of ${a}·n² + ${b}·n + ${c}`;
    }
    case "squares":
      return "perfect squares n² (on the diagonal)";
    case "triangular":
      return "triangular numbers n(n+1)/2";
  }
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

export function mountPanel(host: HTMLElement, store: Store<UlamState>, onChange: () => void): void {
  let scrubEl: HTMLInputElement | null = null;
  let playBtn: HTMLButtonElement | null = null;
  let lastViewKey = "";

  // Drives a full panel re-render: structural compute params plus the bit that
  // changes which controls are shown (the custom quadratic inputs).
  const viewKey = (s: UlamState): string => JSON.stringify({ n: s.n, mode: s.mode, quad: s.quad });

  const syncLive = (s: UlamState): void => {
    if (scrubEl && document.activeElement !== scrubEl) {
      scrubEl.max = String(s.n);
      scrubEl.value = String(Math.floor(s.frame));
    }
    if (playBtn) {
      const atEnd = s.frame >= s.n;
      setPlayContent(playBtn, s.playing, atEnd);
    }
  };

  // The highlight-mode picker: a wrapping grid of pills (more modes than fit one
  // segmented row).
  const modeGrid = (s: UlamState): HTMLElement => {
    const grid = el("div", { className: "ul-modes" });
    for (const opt of MODE_OPTIONS) {
      const btn = el(
        "button",
        { type: "button", className: `ul-mode${opt.value === s.mode ? " is-active" : ""}` },
        [opt.label],
      );
      btn.addEventListener("click", () => {
        store.set({ mode: opt.value });
        onChange();
      });
      grid.append(btn);
    }
    return grid;
  };

  // Compact integer input for a custom quadratic coefficient. A vertical chevron
  // stepper replaces the +/- buttons (too wide for three in a row), and a wheel
  // handler lets the value be scrubbed by scrolling over the input.
  const quadField = (key: "a" | "b" | "c"): HTMLElement => {
    const input = el("input", {
      type: "text",
      inputmode: "numeric",
      className: "ul-quad-input",
      value: String(store.get().quad[key]),
    }) as HTMLInputElement;
    const current = (): number => {
      const cleaned = input.value.replace(/[^\d-]/g, "");
      return cleaned === "" || cleaned === "-" ? store.get().quad[key] : Number(cleaned);
    };
    const commit = (raw: number): void => {
      const v = Math.max(-10_000, Math.min(10_000, Number.isFinite(raw) ? Math.round(raw) : 0));
      input.value = String(v);
      store.set({ quad: { ...store.get().quad, [key]: v } });
      onChange();
    };
    input.addEventListener("change", () => commit(current()));
    input.addEventListener(
      "wheel",
      (e) => {
        e.preventDefault();
        commit(current() + (e.deltaY < 0 ? 1 : -1));
      },
      { passive: false },
    );
    const spin = (dir: 1 | -1, cls: string, title: string): HTMLButtonElement => {
      const btn = el("button", {
        type: "button",
        className: `ul-spin ${cls}`,
        title,
        "aria-label": title,
      }) as HTMLButtonElement;
      btn.append(icon("chevron-down", 10));
      btn.addEventListener("click", () => commit(current() + dir));
      return btn;
    };
    const row = el("div", { className: "ul-quad-row" }, [
      input,
      el("div", { className: "ul-spinner" }, [
        spin(1, "ul-spin--up", "Increase"),
        spin(-1, "ul-spin--down", "Decrease"),
      ]),
    ]);
    return el("div", { className: "cb-field" }, [
      el("span", { className: "cb-field-label ds-label" }, [key]),
      row,
    ]);
  };

  const renderAll = (): void => {
    const s = store.get();
    clear(host);

    playBtn = mButton("Play", {
      icon: "play",
      variant: "primary",
      onClick: () => {
        const st = store.get();
        const atEnd = st.frame >= st.n;
        if (atEnd && !st.playing) store.set({ frame: 0, playing: true });
        else store.set({ playing: !st.playing });
      },
    });
    const stepBtn = mButton("Step", {
      icon: "skip-forward",
      onClick: () => {
        const st = store.get();
        store.set({ playing: false, frame: Math.min(Math.floor(st.frame) + 1, st.n) });
      },
    });

    scrubEl = mSlider({
      min: 0,
      max: s.n,
      value: Math.floor(s.frame),
      onInput: (v) => store.set({ playing: false, frame: v }),
    });
    const speed = mSlider({
      min: 2,
      max: 120,
      value: s.speed,
      onInput: (v) => store.set({ speed: v }),
    });

    const nInput = mNumber({
      value: s.n,
      min: 100,
      max: N_CAP,
      step: nStep,
      onChange: (v) => {
        store.set({ n: v });
        onChange();
      },
    });

    const highlight = el("div", { className: "cb-field" }, [
      el("span", { className: "cb-field-label ds-label" }, ["Highlight"]),
      modeGrid(s),
      el("span", { className: "ds-label cb-field-label ul-caption" }, [modeCaption(s)]),
    ]);

    host.append(
      sectionLabel("Parameters"),
      el("div", { className: "cb-playback" }, [playBtn, stepBtn]),
      field("Reveal", scrubEl),
      field("Speed", speed),
      field("Max integer", nInput),
      highlight,
    );

    if (s.mode === "custom") {
      host.append(
        el("div", { className: "ul-quad" }, [quadField("a"), quadField("b"), quadField("c")]),
      );
    }

    lastViewKey = viewKey(s);
    syncLive(s);
  };

  store.subscribe((s) => {
    if (viewKey(s) !== lastViewKey) renderAll();
    else syncLive(s);
  });
  renderAll();
}
