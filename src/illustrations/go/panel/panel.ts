import { clear, el } from "../../../shared/dom";
import { groupThousands } from "../../../shared/format";
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
import { createDistChart } from "../dist-chart";
import { type Distribution, colorDistribution } from "../distribution";
import { GO_PALETTE, PATTERN_PRESETS, nextAddColor } from "../pattern";
import type { GoState } from "../state";
import type { GoData } from "../types";

const MAX_MOVES_CAP = 10_000_000;

function maxMovesStep(value: number): number {
  if (value < 2000) return 500;
  if (value < 5000) return 1000;
  if (value < 20000) return 2000;
  if (value < 50000) return 5000;
  if (value < 200000) return 10000;
  if (value < 1000000) return 50000;
  return 500000;
}

function setPlayContent(btn: HTMLButtonElement, playing: boolean, atEnd: boolean): void {
  const name = playing ? "pause" : atEnd ? "reset" : "play";
  const label = playing ? "Pause" : atEnd ? "Replay" : "Play";
  btn.replaceChildren(icon(name, 14), el("span", {}, [label]));
}

function sectionLabel(text: string): HTMLElement {
  return el("div", { className: "cb-section" }, [el("span", { className: "ds-label" }, [text])]);
}

function setPattern(store: Store<GoState>, pattern: string[], onChange: () => void): void {
  store.set({ pattern });
  onChange();
}

// A single fixed-positioned 12-swatch popover. Clicking the same anchor toggles
// it closed; opening another closes the previous. Also closes on outside
// mousedown, scroll, resize, or pick. One panel per page, so the active-popover
// state is a module-level singleton.
let closeActivePopover: (() => void) | null = null;
let activePopoverAnchor: HTMLElement | null = null;

function openSwatchPopover(
  anchor: HTMLElement,
  current: string,
  onPick: (color: string) => void,
): void {
  const wasAnchor = activePopoverAnchor;
  closeActivePopover?.(); // close any open popover first
  if (wasAnchor === anchor) return; // same anchor was open → treat this click as a toggle-close

  const pop = el("div", { className: "go-swatch-pop" });
  const close = (): void => {
    pop.remove();
    document.removeEventListener("mousedown", onDoc);
    window.removeEventListener("scroll", onScroll, true);
    window.removeEventListener("resize", close);
    if (closeActivePopover === close) {
      closeActivePopover = null;
      activePopoverAnchor = null;
    }
  };
  const onDoc = (e: MouseEvent): void => {
    // Ignore mousedown on the anchor itself — its click runs the toggle above.
    if (!pop.contains(e.target as Node) && e.target !== anchor) close();
  };
  const onScroll = (): void => close();

  for (const color of GO_PALETTE) {
    const sw = el("button", {
      type: "button",
      className: `go-swatch${color === current ? " is-active" : ""}`,
      style: `background:${color}`,
      title: color,
      "aria-label": color,
    });
    sw.addEventListener("click", () => {
      close();
      onPick(color);
    });
    pop.append(sw);
  }
  document.body.append(pop);
  const r = anchor.getBoundingClientRect();
  pop.style.top = `${Math.round(r.bottom + 6)}px`;
  pop.style.left = `${Math.round(Math.min(r.left, window.innerWidth - pop.offsetWidth - 8))}px`;
  document.addEventListener("mousedown", onDoc);
  window.addEventListener("scroll", onScroll, true);
  window.addEventListener("resize", close);
  closeActivePopover = close;
  activePopoverAnchor = anchor;
}

export function mountGoPanel(host: HTMLElement, store: Store<GoState>, onChange: () => void): void {
  let scrubEl: HTMLInputElement | null = null;
  let playBtn: HTMLButtonElement | null = null;
  let moveOut: HTMLElement | null = null;
  let stoneOut: HTMLElement | null = null;
  let capOut: HTMLElement | null = null;
  let lastStructKey = "";
  const SAMPLES = 256;
  let chart: ReturnType<typeof createDistChart> | null = null;
  let chartData: GoData | null = null; // memo key
  let chartDist: Distribution | null = null;
  let hoverSample: number | null = null; // distribution-chart hover: sampled turn under the pointer

  const structKey = (s: GoState): string =>
    JSON.stringify({ pattern: s.pattern, maxMoves: s.maxMoves });

  // Recompute the distribution only when the data changes (memoized on identity).
  const ensureDist = (s: GoState): void => {
    if (chart && s.data !== chartData) {
      chartData = s.data;
      chartDist = colorDistribution(s.data, SAMPLES);
    }
  };
  const drawChart = (s: GoState): void => {
    if (!chart || !chartDist) return;
    const count = s.data.count;
    const frac = count > 0 ? Math.min(Math.floor(s.frame), count) / count : 0;
    const n = chartDist.samples;
    // n<=1 places the sole sample at the right edge (matching the chart's own xAt).
    const hoverFrac = hoverSample !== null && n > 0 ? (n <= 1 ? 1 : hoverSample / (n - 1)) : null;
    chart.draw(chartDist, s.data.colors, s.chartMode, s.chartScale, frac, hoverFrac);
  };

  const syncLive = (s: GoState): void => {
    if (scrubEl && document.activeElement !== scrubEl) {
      scrubEl.max = String(s.data.count);
      scrubEl.value = String(Math.round(s.frame));
    }
    if (playBtn) {
      const atEnd = s.data.count > 0 && s.frame >= s.data.count;
      setPlayContent(playBtn, s.playing, atEnd);
    }
    const t = Math.min(Math.floor(s.frame), s.data.count);
    const caps = s.data.count > 0 ? s.data.capOffset[t] : 0;
    if (moveOut) moveOut.textContent = groupThousands(t);
    if (stoneOut) stoneOut.textContent = groupThousands(t - caps);
    if (capOut) capOut.textContent = groupThousands(caps);
    ensureDist(s);
    drawChart(s);
  };

  const renderAll = (): void => {
    const s = store.get();
    clear(host);

    playBtn = mButton("Play", {
      icon: "play",
      variant: "primary",
      onClick: () => {
        const st = store.get();
        const atEnd = st.data.count > 0 && st.frame >= st.data.count;
        if (atEnd && !st.playing) store.set({ frame: 0, playing: true });
        else store.set({ playing: !st.playing });
      },
    });
    const stepBtn = mButton("Step", {
      icon: "skip-forward",
      onClick: () => {
        const st = store.get();
        store.set({ playing: false, frame: Math.min(Math.floor(st.frame) + 1, st.data.count) });
      },
    });

    scrubEl = mSlider({
      min: 0,
      max: s.data.count,
      value: Math.round(s.frame),
      onInput: (v) => store.set({ playing: false, frame: v }),
    });
    const speed = mSlider({
      min: 2,
      max: 120,
      value: s.speed,
      onInput: (v) => store.set({ speed: v }),
    });
    const maxMoves = mNumber({
      value: s.maxMoves,
      min: 1,
      max: MAX_MOVES_CAP,
      step: maxMovesStep,
      onChange: (v) => {
        store.set({ maxMoves: v });
        onChange();
      },
    });
    const territoryToggle = mSegmented(
      [
        { value: "off", label: "Off" },
        { value: "on", label: "On" },
      ],
      s.showTerritory ? "on" : "off",
      (v) => store.set({ showTerritory: v === "on" }),
    );

    // Turn-pattern editor: one color-button chip per slot; click opens a swatch
    // popover, and chips reorder by drag and drop.
    let dragSrc = -1;
    const patternRow = el("div", { className: "go-pattern" });
    const movePattern = (from: number, to: number): void => {
      if (from === to || from < 0 || to < 0) return;
      const next = store.get().pattern.slice();
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      setPattern(store, next, onChange);
    };
    s.pattern.forEach((color, i) => {
      const swatch = el("button", {
        type: "button",
        className: "go-chip-swatch",
        style: `background:${color}`,
        title: "Change color",
        "aria-label": "Change color",
      });
      swatch.addEventListener("click", () =>
        openSwatchPopover(swatch, store.get().pattern[i], (picked) => {
          const next = store.get().pattern.slice();
          next[i] = picked;
          setPattern(store, next, onChange);
        }),
      );
      // `draggable: "true"` (string, not boolean) — the boolean path of `el` would
      // emit `draggable=""`, an invalid enumerated value that leaves a div undraggable.
      const chip = el("div", { className: "go-chip", draggable: "true" }, [swatch]);
      chip.addEventListener("dragstart", (e) => {
        dragSrc = i;
        (e as DragEvent).dataTransfer?.setData("text/plain", String(i));
      });
      chip.addEventListener("dragover", (e) => {
        e.preventDefault();
        chip.classList.add("go-chip--drop");
      });
      chip.addEventListener("dragleave", () => chip.classList.remove("go-chip--drop"));
      chip.addEventListener("drop", (e) => {
        e.preventDefault();
        chip.classList.remove("go-chip--drop");
        movePattern(dragSrc, i);
      });
      if (s.pattern.length > 1) {
        const remove = el(
          "button",
          {
            type: "button",
            className: "go-chip-remove",
            title: "Remove turn",
            "aria-label": "Remove turn",
          },
          [icon("x", 12)],
        );
        remove.addEventListener("click", () => {
          const next = store.get().pattern.slice();
          next.splice(i, 1);
          setPattern(store, next, onChange);
        });
        chip.append(remove);
      }
      patternRow.append(chip);
    });
    const addChip = mIconButton("plus", {
      title: "Add turn",
      onClick: () => {
        const cur = store.get().pattern;
        setPattern(store, [...cur, nextAddColor(cur)], onChange);
      },
    });
    patternRow.append(addChip);

    const presets = el(
      "div",
      { className: "go-presets" },
      PATTERN_PRESETS.map((p) =>
        mButton(p.name, { onClick: () => setPattern(store, [...p.pattern], onChange) }),
      ),
    );

    const readout = el("div", { className: "go-readout" }, [
      readoutItem("Move", (m) => {
        moveOut = m;
      }),
      readoutItem("Stones", (m) => {
        stoneOut = m;
      }),
      readoutItem("Captures", (m) => {
        capOut = m;
      }),
    ]);

    const modeToggle = mSegmented<"stacked" | "lines">(
      [
        { value: "stacked", label: "Stacked" },
        { value: "lines", label: "Lines" },
      ],
      s.chartMode,
      (v) => store.set({ chartMode: v }),
    );
    const scaleToggle = mSegmented<"percentage" | "absolute">(
      [
        { value: "percentage", label: "Percent" },
        { value: "absolute", label: "Absolute" },
      ],
      s.chartScale,
      (v) => store.set({ chartScale: v }),
    );
    const chartCanvas = el("canvas", { className: "go-dist-canvas" }) as HTMLCanvasElement;
    const tip = el("div", { className: "go-dist-tip" });
    const chartWrap = el("div", { className: "go-dist-wrap" }, [chartCanvas, tip]);
    chart = createDistChart(chartCanvas);
    chartData = null; // force a distribution recompute on the next syncLive
    hoverSample = null;

    // Hover readout: the per-color live counts at the turn under the pointer.
    chartCanvas.addEventListener("mousemove", (e) => {
      if (!chartDist || chartDist.samples === 0 || chartDist.colorCount === 0) return;
      const rect = chartCanvas.getBoundingClientRect();
      const n = chartDist.samples;
      const f = rect.width > 0 ? (e.clientX - rect.left) / rect.width : 0;
      hoverSample = Math.max(0, Math.min(n - 1, Math.round(f * (n - 1))));
      fillDistTip(tip, chartWrap, chartDist, store.get().data.colors, hoverSample, e);
      drawChart(store.get());
    });
    chartCanvas.addEventListener("mouseleave", () => {
      hoverSample = null;
      tip.style.display = "none";
      drawChart(store.get());
    });

    host.append(
      sectionLabel("Parameters"),
      el("div", { className: "cb-playback" }, [playBtn, stepBtn]),
      field("Zoom", scrubEl),
      field("Speed", speed),
      field("Max moves", maxMoves),
      field("Captured area", territoryToggle),
      readout,
      sectionLabel("Distribution"),
      field("Mode", modeToggle),
      field("Scale", scaleToggle),
      chartWrap,
      sectionLabel("Turn order"),
      field("Pattern", patternRow),
      field("Presets", presets),
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

// Fills the distribution-chart hover tooltip with the live per-color counts at the
// sampled turn under the pointer, and positions it opposite the cursor.
function fillDistTip(
  tip: HTMLElement,
  wrap: HTMLElement,
  dist: Distribution,
  colors: string[],
  sample: number,
  e: MouseEvent,
): void {
  const C = dist.colorCount;
  let total = 0;
  for (let c = 0; c < C; c++) total += dist.counts[sample * C + c];
  clear(tip);
  tip.append(
    el("div", { className: "go-tip-turn" }, [`Turn ${groupThousands(dist.turns[sample])}`]),
  );
  for (let c = 0; c < C; c++) {
    const cnt = dist.counts[sample * C + c];
    const pct = total > 0 ? Math.round((cnt / total) * 100) : 0;
    tip.append(
      el("div", { className: "go-tip-row" }, [
        el("span", { className: "go-tip-swatch", style: `background:${colors[c]}` }),
        el("span", { className: "go-tip-val" }, [groupThousands(cnt)]),
        el("span", { className: "go-tip-pct" }, [`${pct}%`]),
      ]),
    );
  }
  tip.style.display = "block";
  const wrapRect = wrap.getBoundingClientRect();
  const localX = e.clientX - wrapRect.left;
  const tw = tip.offsetWidth;
  let left = localX + 12;
  if (left + tw > wrapRect.width) left = localX - tw - 12;
  if (left < 0) left = 0;
  tip.style.left = `${Math.round(left)}px`;
  tip.style.top = "4px";
}

function readoutItem(label: string, bind: (valueEl: HTMLElement) => void): HTMLElement {
  const value = el("span", { className: "go-readout-value" }, ["0"]);
  bind(value);
  return el("div", { className: "go-readout-item" }, [
    el("span", { className: "ds-label" }, [label]),
    value,
  ]);
}
