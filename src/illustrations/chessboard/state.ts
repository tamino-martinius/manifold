import { type Store, createStore } from "../../shared/store";
import { defaultPieces } from "./pieces";
import { computePlacements } from "./placement";
import type { Piece, Placement, StrategyKind } from "./types";

export type ChessboardState = {
  pieces: Piece[];
  strategy: StrategyKind;
  maxPieces: number;
  frame: number;
  playing: boolean;
  speed: number;
  placements: Placement[];
};

export function createChessboardStore(): Store<ChessboardState> {
  const pieces = defaultPieces();
  const strategy: StrategyKind = "round-robin";
  const maxPieces = 1200;
  return createStore<ChessboardState>({
    pieces,
    strategy,
    maxPieces,
    frame: 0,
    playing: true,
    speed: 30,
    placements: computePlacements(pieces, strategy, maxPieces),
  });
}

export function recomputePlacements(store: Store<ChessboardState>): void {
  const { pieces, strategy, maxPieces, frame } = store.get();
  const placements = computePlacements(pieces, strategy, maxPieces);
  store.set({ placements, frame: Math.min(frame, placements.length) });
}
