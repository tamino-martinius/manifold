import { clear, el } from "../../../shared/dom";
import { icon } from "../../../shared/icons";
import type { Store } from "../../../shared/store";
import { field, mButton, mNumber, mSegmented, mSlider } from "../../chessboard/panel/controls";
import type { ColorMode, PascalState } from "../state";

const MAX_ROWS = 4000;

// Adaptive +/- step for the rows (depth) field.
function rowsStep(value: number): number {
  return value < 100 ? 1 : value < 1000 ? 10 : 100;
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
  store: Store<PascalState>,
  // Called when the user restarts the reveal from the top (the "Replay" button at
  // the end). Lets the host drop any manual zoom/pan so replay re-runs the initial
  // auto-fit "zoom in and zoom out as it reveals" animation.
  onRestart: () => void = () => {},
): void {
  let scrubEl: HTMLInputElement | null = null;
  let playBtn: HTMLButtonElement | null = null;
  let lastStructKey = "";

  // Re-render only when a control's PRESENCE/active-state changes. `m`, `frame`
  // and `speed` are dragged sliders → kept out so dragging never rebuilds the
  // element under the cursor (their live values are synced in place instead).
  const structKey = (s: PascalState): string =>
    JSON.stringify({ colorMode: s.colorMode, rows: s.rows });

  const syncLive = (s: PascalState): void => {
    if (scrubEl && document.activeElement !== scrubEl) {
      scrubEl.max = String(s.rows);
      scrubEl.value = String(Math.round(s.frame));
    }
    if (playBtn) {
      const atEnd = s.rows > 0 && s.frame >= s.rows;
      setPlayContent(playBtn, s.playing, atEnd);
    }
  };

  const renderAll = (): void => {
    const s = store.get();
    clear(host);

    // 1. Playback
    playBtn = mButton("Play", {
      icon: "play",
      variant: "primary",
      onClick: () => {
        const st = store.get();
        const atEnd = st.rows > 0 && st.frame >= st.rows;
        if (atEnd && !st.playing) {
          onRestart(); // re-run the auto-fit reveal, not the user's manual zoom
          store.set({ frame: 0, playing: true });
        } else store.set({ playing: !st.playing });
      },
    });
    const stepBtn = mButton("Step", {
      icon: "skip-forward",
      onClick: () => {
        const st = store.get();
        store.set({ playing: false, frame: Math.min(Math.floor(st.frame) + 1, st.rows) });
      },
    });

    // 2. Timeline (rows revealed)
    scrubEl = mSlider({
      min: 0,
      max: s.rows,
      value: Math.round(s.frame),
      onInput: (v) => store.set({ playing: false, frame: v }),
    });

    // 3. Speed (rows/sec)
    const speed = mSlider({
      min: 5,
      max: 500,
      value: s.speed,
      onInput: (v) => store.set({ speed: v }),
    });

    // 4. Modulus m — the marquee control, with a live readout that updates as it
    // drags (no panel rebuild, so the slider stays under the cursor).
    const mValue = el("span", { className: "pa-readout" }, [`m = ${s.m}`]);
    const mSliderEl = mSlider({
      min: 2,
      max: 128,
      value: s.m,
      onInput: (v) => {
        mValue.textContent = `m = ${v}`;
        store.set({ m: v });
      },
    });
    const modulusField = el("div", { className: "cb-field" }, [
      el("div", { className: "cb-field-head" }, [
        el("span", { className: "cb-field-label ds-label" }, ["Modulus"]),
        mValue,
      ]),
      mSliderEl,
    ]);

    // 5. Rows (depth)
    const rows = mNumber({
      value: s.rows,
      min: 1,
      max: MAX_ROWS,
      step: rowsStep,
      onChange: (v) => {
        const st = store.get();
        // A timeline parked at the end follows to the new end; otherwise the
        // reveal stays put (just clamped so frame never exceeds the new depth).
        const atEnd = st.frame >= st.rows;
        store.set({ rows: v, frame: atEnd ? v : Math.min(st.frame, v) });
      },
    });

    // 6. Color mode (residue numbers auto-fade in at high zoom — no toggle)
    const colorMode = mSegmented<ColorMode>(
      [
        { value: "binary", label: "Binary" },
        { value: "hue", label: "Hue" },
        { value: "parity", label: "Parity" },
        { value: "prime", label: "Prime" },
        { value: "perfect", label: "Perfect" },
      ],
      s.colorMode,
      (v) => store.set({ colorMode: v }),
    );

    host.append(
      sectionLabel("Parameters"),
      el("div", { className: "cb-playback" }, [playBtn, stepBtn]),
      field("Timeline", scrubEl),
      field("Speed", speed),
      modulusField,
      field("Rows", rows),
      field("Color", colorMode),
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
