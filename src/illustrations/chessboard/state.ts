import { type Store, createStore } from "../../shared/store";
import { defaultPieces } from "./pieces";
import type { Piece, PlacedData, StrategyKind } from "./types";

export type ChessboardState = {
  pieces: Piece[];
  strategy: StrategyKind;
  maxPieces: number;
  frame: number;
  playing: boolean;
  speed: number;
  /** Columnar placement data; `count` is 0 until the first compute finishes. */
  placed: PlacedData;
  /** True while the worker is (re)computing placements. */
  loading: boolean;
  /** Compute progress, 0..1. */
  progress: number;
};

export const EMPTY_PLACED: PlacedData = {
  xs: new Int32Array(0),
  ys: new Int32Array(0),
  colorIndex: new Uint8Array(0),
  colors: [],
  count: 0,
};

export function createChessboardStore(): Store<ChessboardState> {
  return createStore<ChessboardState>({
    pieces: defaultPieces(),
    strategy: "round-robin",
    maxPieces: 2000,
    frame: 0,
    playing: true,
    speed: 30,
    placed: EMPTY_PLACED,
    loading: true,
    progress: 0,
  });
}
