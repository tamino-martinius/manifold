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
import { GO_PALETTE, PATTERN_PRESETS, nextAddColor } from "../pattern";
import type { GoState } from "../state";

const MAX_MOVES_CAP = 1_000_000;

function maxMovesStep(value: number): number {
  if (value < 2000) return 500;
  if (value < 5000) return 1000;
  if (value < 20000) return 2000;
  if (value < 50000) return 5000;
  return 10000;
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

// A small fixed-positioned 12-swatch popover anchored under `anchor`. Closes on
// outside-click, scroll, or pick. Mirrors the chessboard dropdown pattern.
function openSwatchPopover(
  anchor: HTMLElement,
  current: string,
  onPick: (color: string) => void,
): void {
  const pop = el("div", { className: "go-swatch-pop" });
  const close = (): void => {
    pop.remove();
    document.removeEventListener("mousedown", onDoc);
    window.removeEventListener("scroll", onScroll, true);
    window.removeEventListener("resize", close);
  };
  const onDoc = (e: MouseEvent): void => {
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
}

export function mountGoPanel(host: HTMLElement, store: Store<GoState>, onChange: () => void): void {
  let scrubEl: HTMLInputElement | null = null;
  let playBtn: HTMLButtonElement | null = null;
  let moveOut: HTMLElement | null = null;
  let stoneOut: HTMLElement | null = null;
  let capOut: HTMLElement | null = null;
  let lastStructKey = "";

  const structKey = (s: GoState): string =>
    JSON.stringify({ pattern: s.pattern, maxMoves: s.maxMoves });

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

    host.append(
      sectionLabel("Parameters"),
      el("div", { className: "cb-playback" }, [playBtn, stepBtn]),
      field("Zoom", scrubEl),
      field("Speed", speed),
      field("Max moves", maxMoves),
      field("Captured area", territoryToggle),
      readout,
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

function readoutItem(label: string, bind: (valueEl: HTMLElement) => void): HTMLElement {
  const value = el("span", { className: "go-readout-value" }, ["0"]);
  bind(value);
  return el("div", { className: "go-readout-item" }, [
    el("span", { className: "ds-label" }, [label]),
    value,
  ]);
}
