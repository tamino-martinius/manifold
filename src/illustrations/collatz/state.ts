import { type Store, createStore } from "../../shared/store";
import { type CollatzGeometry, EMPTY_GEOM } from "./collatz";

export type ColorMode = "solid" | "depth-gradient";

export type CollatzState = {
  n: number; // seeds 1..n
  thetaEvenDeg: number; // even-step turn, degrees
  thetaOddDeg: number; // odd-step turn, degrees
  segLen: number; // base segment length, world units (camera refits, so fixed)
  lenVar: number; // per-segment length jitter, 0..1
  opacity: number; // base stroke alpha
  colorMode: ColorMode;
  frame: number; // reveal position (by child depth)
  playing: boolean;
  speed: number;
  /** Columnar coral geometry; `edgeCount` is 0 until the first build finishes. */
  geom: CollatzGeometry;
  /** True while a (debounced) geometry build is in flight. */
  loading: boolean;
  /** Build progress, 0..1 (only meaningful for the worker path; sync stays at 1). */
  progress: number;
};

export function createCollatzStore(): Store<CollatzState> {
  return createStore<CollatzState>({
    n: 2500,
    thetaEvenDeg: 8,
    thetaOddDeg: 16,
    segLen: 1.6,
    lenVar: 0.35,
    opacity: 0.3,
    colorMode: "depth-gradient",
    frame: 0,
    playing: true,
    speed: 30,
    geom: EMPTY_GEOM,
    loading: true,
    progress: 0,
  });
}
