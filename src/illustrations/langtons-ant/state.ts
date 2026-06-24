import { type Store, createStore } from "../../shared/store";

export type CameraMode = "fit" | "follow";
export type TrailMode = "off" | "comet";

// Speed slider: a raw value in [SPEED_RAW_MIN, SPEED_RAW_MAX] mapped exponentially
// to steps-advanced-per-frame in [SPF_MIN, SPF_MAX], so the low end stays
// fine-grained (crawl one step at a time) while the top still races through the
// chaos into the highway.
export const SPEED_RAW_MIN = 1;
export const SPEED_RAW_MAX = 1000;
const SPF_MIN = 1;
const SPF_MAX = 5000;

export function stepsPerFrame(raw: number): number {
  const t = (raw - SPEED_RAW_MIN) / (SPEED_RAW_MAX - SPEED_RAW_MIN);
  return Math.round(SPF_MIN * (SPF_MAX / SPF_MIN) ** t);
}

export type LangtonState = {
  /** Rule string (structural — changing it resets the simulation). */
  rule: string;
  /** Inline validation message for an invalid rule, or null when valid. */
  ruleError: string | null;
  playing: boolean;
  /** Raw speed-slider value; mapped exponentially to steps-per-frame in main. */
  speed: number;
  mode: CameraMode;
  /** Cells across the viewport in "Follow ant" mode. */
  followCells: number;
  trail: TrailMode;
  // --- live readouts mirrored from the sim (panel reads these) ---
  steps: number;
  blackCount: number;
  highway: boolean;
};

export function createLangtonStore(): Store<LangtonState> {
  return createStore<LangtonState>({
    rule: "LLRR",
    ruleError: null,
    playing: true,
    speed: 300,
    mode: "fit",
    followCells: 60,
    trail: "comet",
    steps: 0,
    blackCount: 0,
    highway: false,
  });
}
