import { type Store, createStore } from "../../shared/store";

export type ColorMode = "gradient" | "solid";

export type HilbertState = {
  /** Curve order: fills a 2^k × 2^k grid (N = 4^k points). Structural. */
  k: number;
  /** Draw-progress: points revealed along d, 0..4^k. */
  frame: number;
  playing: boolean;
  /** Reveal rate (points/tick base); accelerates like the chessboard fill. */
  speed: number;
  /** `gradient` = hue-along-path (locality headline); `solid` = one accent line. */
  colorMode: ColorMode;
};

export const MIN_ORDER = 1;
export const MAX_ORDER = 9; // 4^9 = 262,144 points — still trivial, synchronous.

export function createHilbertStore(): Store<HilbertState> {
  return createStore<HilbertState>({
    k: 6,
    frame: 0,
    playing: true,
    speed: 30,
    colorMode: "gradient",
  });
}
