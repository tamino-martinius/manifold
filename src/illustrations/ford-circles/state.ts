import { type Store, createStore } from "../../shared/store";
import type { FordCircle } from "./farey";

export type ColorMode = "denominator" | "depth";
export type FillMode = "fill" | "outline";

// Shared defaults so the studio, gallery preview, and README screenshot all match.
export const DEFAULT_ORDER = 100;
export const DEFAULT_COLOR_MODE: ColorMode = "depth";
export const DEFAULT_FILL_MODE: FillMode = "fill";

export type FordState = {
  /** Max denominator n (the Farey order); higher reveals more, smaller circles. */
  order: number;
  /** Visible interval [intervalA, intervalB] on the number line. */
  intervalA: number;
  intervalB: number;
  /** Reveal position 0..order; circles with q ≤ frame are drawn. */
  frame: number;
  playing: boolean;
  /** Orders revealed per second while playing. */
  speed: number;
  colorMode: ColorMode;
  fillMode: FillMode;
  /** Cached circle set for the current (order, interval); recomputed on change. */
  circles: FordCircle[];
};

export function createFordStore(): Store<FordState> {
  return createStore<FordState>({
    order: DEFAULT_ORDER,
    intervalA: 0,
    intervalB: 1,
    frame: 0,
    playing: true,
    speed: 8,
    colorMode: DEFAULT_COLOR_MODE,
    fillMode: DEFAULT_FILL_MODE,
    circles: [],
  });
}
