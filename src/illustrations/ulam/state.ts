import { type Store, createStore } from "../../shared/store";
import type { HighlightMode, Quad } from "./sieve";
import { EMPTY_ULAM, type UlamData } from "./types";

export type UlamState = {
  /** Max integer laid on the spiral. Structural — changing it re-sieves. */
  n: number;
  /** Which lit primes get the second hue. Structural. */
  mode: HighlightMode;
  /** Custom quadratic a·k²+b·k+c (also the source of Euler when mode==="euler"). */
  quad: Quad;
  /** Timeline position: integers 1..frame are revealed in spiral order. */
  frame: number;
  playing: boolean;
  speed: number;
  /** Columnar lit-cell data; `count` is 0 until the first compute finishes. */
  data: UlamData;
  /** True while (re)computing the sieve + highlight flags. */
  loading: boolean;
  /** Compute progress, 0..1. */
  progress: number;
};

export function createUlamStore(): Store<UlamState> {
  return createStore<UlamState>({
    n: 200_000,
    mode: "euler",
    quad: { a: 1, b: 1, c: 41 },
    frame: 0,
    playing: true,
    speed: 30,
    data: EMPTY_ULAM,
    loading: true,
    progress: 0,
  });
}
