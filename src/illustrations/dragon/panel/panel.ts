import { clear, el } from "../../../shared/dom";
import { icon } from "../../../shared/icons";
import type { Store } from "../../../shared/store";
// Reuse the chessboard's Manifold-styled control builders and chrome (cb-*).
import { field, mButton, mNumber, mSegmented, mSlider } from "../../chessboard/panel/controls";
import { type AnimateMode, type ColorMode, type DragonState, MAX_ORDER, MIN_ORDER } from "../state";

function atEnd(s: DragonState): boolean {
  return s.animateMode === "iteration" ? s.frame >= s.order : s.foldAngle >= 90;
}

function setPlayContent(btn: HTMLButtonElement, playing: boolean, ended: boolean): void {
  const name = playing ? "pause" : ended ? "reset" : "play";
  const label = playing ? "Pause" : ended ? "Replay" : "Play";
  btn.replaceChildren(icon(name, 14), el("span", {}, [label]));
}

function sectionLabel(text: string, trailing?: string): HTMLElement {
  return el("div", { className: "cb-section" }, [
    el("span", { className: "ds-label" }, [text]),
    ...(trailing ? [el("span", { className: "ds-label cb-section-meta" }, [trailing])] : []),
  ]);
}

export function mountPanel(host: HTMLElement, store: Store<DragonState>): void {
  let scrubEl: HTMLInputElement | null = null;
  let foldEl: HTMLInputElement | null = null;
  let playBtn: HTMLButtonElement | null = null;
  let lastStructKey = "";

  // Structural params: changing any rebuilds the panel (re-targets the timeline,
  // refreshes the active pills). Live values (frame, foldAngle, playing, speed)
  // are synced in place so dragging stays smooth.
  const structKey = (s: DragonState): string =>
    JSON.stringify({
      order: s.order,
      animateMode: s.animateMode,
      colorMode: s.colorMode,
      tiling: s.tiling,
    });

  const syncLive = (s: DragonState): void => {
    if (scrubEl && document.activeElement !== scrubEl) {
      scrubEl.value = String(Math.round(s.animateMode === "iteration" ? s.frame : s.foldAngle));
    }
    if (foldEl && document.activeElement !== foldEl) {
      foldEl.value = String(Math.round(s.foldAngle));
    }
    if (playBtn) setPlayContent(playBtn, s.playing, atEnd(s));
  };

  const renderAll = (): void => {
    const s = store.get();
    clear(host);

    // 1 — Playback
    playBtn = mButton("Play", {
      icon: "play",
      variant: "primary",
      onClick: () => {
        const st = store.get();
        if (atEnd(st) && !st.playing) {
          if (st.animateMode === "iteration") store.set({ frame: MIN_ORDER, playing: true });
          else store.set({ foldAngle: 0, playing: true });
        } else {
          store.set({ playing: !st.playing });
        }
      },
    });
    const stepBtn = mButton("Step", {
      icon: "skip-forward",
      onClick: () => {
        const st = store.get();
        if (st.animateMode === "iteration") {
          store.set({ playing: false, frame: Math.min(Math.round(st.frame) + 1, st.order) });
        } else {
          store.set({ playing: false, foldAngle: Math.min(Math.round(st.foldAngle) + 5, 90) });
        }
      },
    });

    // 2 — Timeline (range depends on the animate mode)
    scrubEl =
      s.animateMode === "iteration"
        ? mSlider({
            min: MIN_ORDER,
            max: s.order,
            step: 1,
            value: Math.round(s.frame),
            onInput: (v) => store.set({ playing: false, frame: v }),
          })
        : mSlider({
            min: 0,
            max: 90,
            step: 1,
            value: Math.round(s.foldAngle),
            onInput: (v) => store.set({ playing: false, foldAngle: v }),
          });

    // 3 — Speed
    const speed = mSlider({
      min: 1,
      max: 40,
      value: s.speed,
      onInput: (v) => store.set({ speed: v }),
    });

    // 4 — Order k
    const order = mNumber({
      value: s.order,
      min: MIN_ORDER,
      max: MAX_ORDER,
      step: 1,
      onChange: (v) => store.set({ order: v, frame: Math.min(store.get().frame, v) }),
    });

    // 5 — Fold angle (degrees) — static morph control
    foldEl = mSlider({
      min: 0,
      max: 90,
      step: 1,
      value: Math.round(s.foldAngle),
      onInput: (v) => store.set({ playing: false, foldAngle: v }),
    });

    // 6 — Animate mode
    const animate = mSegmented<AnimateMode>(
      [
        { value: "iteration", label: "Iteration" },
        { value: "fold", label: "Fold morph" },
      ],
      s.animateMode,
      (v) => store.set({ animateMode: v, playing: false }),
    );

    // 7 — Colour mode
    const color = mSegmented<ColorMode>(
      [
        { value: "position", label: "Position" },
        { value: "solid", label: "Solid" },
      ],
      s.colorMode,
      (v) => store.set({ colorMode: v }),
    );

    // 8 — Tiling
    const tiling = mSegmented<"1" | "4">(
      [
        { value: "1", label: "1 copy" },
        { value: "4", label: "4 copies" },
      ],
      s.tiling ? "4" : "1",
      (v) => store.set({ tiling: v === "4" }),
    );

    const timelineLabel =
      s.animateMode === "iteration" ? "Timeline (order k)" : "Timeline (fold °)";

    host.append(
      sectionLabel("Parameters"),
      el("div", { className: "cb-playback" }, [playBtn, stepBtn]),
      field(timelineLabel, scrubEl),
      field("Speed", speed),
      field("Order k", order),
      field("Fold angle °", foldEl),
      field("Animate", animate),
      field("Colour", color),
      field("Tiling", tiling),
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
