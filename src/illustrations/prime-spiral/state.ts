import { type Store, createStore } from "../../shared/store";
import type { PrimeSpiralData } from "./types";

/** The modulus the 44-arm convergent of 2π sits at — marked on the slider. */
export const COLOR_MOD_MARK = 44;
export const COLOR_MOD_MIN = 2;
export const COLOR_MOD_MAX = 64;

export type PrimeSpiralState = {
  /** Max integer N (structural — changing it recomputes the sieve + coords). */
  n: number;
  /** Reveal cursor: only integers `<= frame` are drawn. */
  frame: number;
  playing: boolean;
  /** Integers-per-second base for the accelerating reveal. */
  speed: number;
  /** Modulus for residue (arm) coloring, 2..64. Live. */
  colorMod: number;
  /** Draw the full integer lattice faintly beneath the primes. Live. */
  showAll: boolean;
  /** Multiplier on the level-of-detail dot radius. Live. */
  dotScale: number;
  /** Columnar spiral data; `n` is 0 until the first compute finishes. */
  data: PrimeSpiralData;
  /** True while the worker is (re)computing. */
  loading: boolean;
  /** Compute progress, 0..1. */
  progress: number;
};

export const EMPTY_DATA: PrimeSpiralData = {
  xs: new Float64Array(0),
  ys: new Float64Array(0),
  isPrime: new Uint8Array(0),
  n: 0,
};

export function createPrimeSpiralStore(): Store<PrimeSpiralState> {
  return createStore<PrimeSpiralState>({
    n: 50000,
    frame: 1,
    playing: true,
    speed: 30,
    colorMod: 6,
    showAll: false,
    dotScale: 1.6,
    data: EMPTY_DATA,
    loading: true,
    progress: 0,
  });
}
