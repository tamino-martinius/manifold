import { clear, el } from "../../shared/dom";
import { groupThousands } from "../../shared/format";
import { icon } from "../../shared/icons";
import type { Store } from "../../shared/store";
// Reuse the shared Manifold control builders from the chessboard panel.
import { field, mButton, mSegmented, mSlider } from "../chessboard/panel/controls";
import {
  type CameraMode,
  type LangtonState,
  SPEED_RAW_MAX,
  SPEED_RAW_MIN,
  type TrailMode,
  stepsPerFrame,
} from "./state";

export type PanelActions = {
  step(): void;
  reset(): void;
  /** Advance the simulation by a fixed number of steps in one jump. */
  forward(steps: number): void;
  /** Commit a (possibly invalid) rule string; the owner validates and rebuilds. */
  setRule(value: string): void;
};

const JUMPS: { label: string; steps: number }[] = [
  { label: "+10K", steps: 10_000 },
  { label: "+100K", steps: 100_000 },
  { label: "+1M", steps: 1_000_000 },
];

const RULE_PRESETS = ["RL", "RLR", "LLRR"];

function setPlayContent(btn: HTMLButtonElement, playing: boolean): void {
  btn.replaceChildren(
    icon(playing ? "pause" : "play", 14),
    el("span", {}, [playing ? "Pause" : "Play"]),
  );
}

function sectionLabel(text: string): HTMLElement {
  return el("div", { className: "cb-section" }, [el("span", { className: "ds-label" }, [text])]);
}

export function mountPanel(
  host: HTMLElement,
  store: Store<LangtonState>,
  actions: PanelActions,
): void {
  let playBtn: HTMLButtonElement | null = null;
  let speedSlider: HTMLInputElement | null = null;
  let speedReadout: HTMLElement | null = null;
  let ruleInput: HTMLInputElement | null = null;
  let ruleError: HTMLElement | null = null;
  let stepReadout: HTMLElement | null = null;
  let blackReadout: HTMLElement | null = null;
  let highwayBadge: HTMLElement | null = null;
  let lastStructKey = "";

  // Only `mode` changes the panel's shape (the Follow-cells field appears). The
  // rule error, readouts and play label all sync live so the text input keeps focus.
  const structKey = (s: LangtonState): string => s.mode;

  const syncLive = (s: LangtonState): void => {
    if (playBtn) setPlayContent(playBtn, s.playing);
    if (speedSlider && document.activeElement !== speedSlider) speedSlider.value = String(s.speed);
    if (speedReadout) speedReadout.textContent = `${groupThousands(stepsPerFrame(s.speed))}/frame`;
    if (ruleInput && document.activeElement !== ruleInput) ruleInput.value = s.rule;
    if (ruleInput) ruleInput.classList.toggle("is-invalid", s.ruleError !== null);
    if (ruleError) {
      ruleError.textContent = s.ruleError ?? "";
      ruleError.classList.toggle("is-visible", s.ruleError !== null);
    }
    if (stepReadout) stepReadout.textContent = groupThousands(s.steps);
    if (blackReadout) blackReadout.textContent = groupThousands(s.blackCount);
    if (highwayBadge) highwayBadge.classList.toggle("is-visible", s.highway);
  };

  const renderAll = (): void => {
    const s = store.get();
    clear(host);

    // ---- Playback ----
    playBtn = mButton("Play", {
      icon: "play",
      variant: "primary",
      onClick: () => store.set((st) => ({ playing: !st.playing })),
    });
    const stepBtn = mButton("Step", { icon: "skip-forward", onClick: () => actions.step() });
    const resetBtn = mButton("Reset", { icon: "reset", onClick: () => actions.reset() });

    speedSlider = mSlider({
      min: SPEED_RAW_MIN,
      max: SPEED_RAW_MAX,
      value: s.speed,
      onInput: (v) => store.set({ speed: v }),
    });
    speedReadout = el("span", { className: "ds-label la-meta" }, [
      `${groupThousands(stepsPerFrame(s.speed))}/frame`,
    ]);
    const speedHead = el("div", { className: "cb-field-head" }, [
      el("span", { className: "cb-field-label ds-label" }, ["Speed"]),
      speedReadout,
    ]);
    const jumps = el(
      "div",
      { className: "cb-playback" },
      JUMPS.map((j) => mButton(j.label, { onClick: () => actions.forward(j.steps) })),
    );

    // ---- Rule string ----
    ruleInput = el("input", {
      type: "text",
      className: "la-rule-input",
      value: s.rule,
      spellcheck: false,
      autocomplete: "off",
      onInput: (e: Event) =>
        actions.setRule((e.target as HTMLInputElement).value.trim().toUpperCase()),
    }) as HTMLInputElement;
    ruleError = el("span", { className: "la-rule-error" });
    const presets = mSegmented(
      RULE_PRESETS.map((r) => ({ value: r, label: r })),
      RULE_PRESETS.includes(s.rule) ? s.rule : ("" as string),
      (v) => actions.setRule(v),
    );

    // ---- Camera ----
    const mode = mSegmented<CameraMode>(
      [
        { value: "fit", label: "Fit region" },
        { value: "follow", label: "Follow ant" },
      ],
      s.mode,
      (v) => store.set({ mode: v }),
    );
    const cameraFields: HTMLElement[] = [field("Camera", mode)];
    if (s.mode === "follow") {
      const follow = mSlider({
        min: 12,
        max: 240,
        value: s.followCells,
        onInput: (v) => store.set({ followCells: v }),
      });
      cameraFields.push(field("Cells across", follow));
    }

    // ---- Trail ----
    const trail = mSegmented<TrailMode>(
      [
        { value: "off", label: "Off" },
        { value: "comet", label: "Comet" },
      ],
      s.trail,
      (v) => store.set({ trail: v }),
    );

    // ---- Readouts ----
    stepReadout = el("span", { className: "la-readout-value" }, [groupThousands(s.steps)]);
    blackReadout = el("span", { className: "la-readout-value" }, [groupThousands(s.blackCount)]);
    highwayBadge = el("div", { className: "la-badge" }, [
      icon("hash", 12),
      el("span", {}, ["Highway"]),
    ]);
    const readouts = el("div", { className: "la-readouts" }, [
      el("div", { className: "la-readout" }, [
        el("span", { className: "ds-label la-readout-key" }, ["Step"]),
        stepReadout,
      ]),
      el("div", { className: "la-readout" }, [
        el("span", { className: "ds-label la-readout-key" }, ["Black"]),
        blackReadout,
      ]),
      highwayBadge,
    ]);

    host.append(
      sectionLabel("Parameters"),
      el("div", { className: "cb-playback" }, [playBtn, stepBtn, resetBtn]),
      el("div", { className: "cb-field" }, [speedHead, speedSlider]),
      field("Jump ahead", jumps),
      sectionLabel("Rule"),
      el("div", { className: "cb-field" }, [
        el("div", { className: "la-rule-row" }, [ruleInput]),
        ruleError,
        presets,
      ]),
      sectionLabel("View"),
      ...cameraFields,
      field("Trail", trail),
      sectionLabel("Readout"),
      readouts,
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
