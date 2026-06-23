import { type Store, createStore } from "../../shared/store";
import type { GoldbachData } from "./goldbach";

/** Dot colouring mode (a pure render decision — no recompute). */
export type ColorBy = "none" | "mod6" | "div3";

export type GoldbachState = {
  /** Structural — changing it re-sieves and re-accumulates. */
  N: number;
  /** Result of goldbachCounts(N); `E.length` is 0 until the first compute lands. */
  data: GoldbachData;
  /** Reveal position, 0..data.E.length. */
  frame: number;
  playing: boolean;
  speed: number;
  colorBy: ColorBy; // non-structural
  pointSize: number; // non-structural
  pointAlpha: number; // non-structural
  /** True while (re)computing. */
  loading: boolean;
  /** Compute progress, 0..1. */
  progress: number;
};

export const EMPTY_DATA: GoldbachData = {
  E: new Int32Array(0),
  g: new Int32Array(0),
  maxG: 0,
};

export function createGoldbachStore(): Store<GoldbachState> {
  return createStore<GoldbachState>({
    N: 20000,
    data: EMPTY_DATA,
    frame: 0,
    playing: true,
    speed: 30,
    colorBy: "mod6",
    pointSize: 3.0,
    pointAlpha: 0.35,
    loading: true,
    progress: 0,
  });
}
