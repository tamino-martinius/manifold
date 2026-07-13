import { pickDistinctColor } from "../../../shared/color";
import { clear, el } from "../../../shared/dom";
import { groupThousands } from "../../../shared/format";
import { icon } from "../../../shared/icons";
import type { Store } from "../../../shared/store";
import { field, mButton, mIconButton, mNumber, mSlider } from "../../chessboard/panel/controls";
import { GO_PALETTE, PATTERN_PRESETS } from "../pattern";
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

    // Turn-pattern editor: one colored chip per slot.
    const patternRow = el("div", { className: "go-pattern" });
    s.pattern.forEach((color, i) => {
      const swatch = el("input", {
        type: "color",
        className: "go-chip-swatch",
        value: color,
        onInput: (e: Event) => {
          const next = store.get().pattern.slice();
          next[i] = (e.target as HTMLInputElement).value;
          setPattern(store, next, onChange);
        },
      });
      const chip = el("div", { className: "go-chip" }, [swatch]);
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
        const color = pickDistinctColor(cur, GO_PALETTE);
        setPattern(store, [...cur, color], onChange);
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
