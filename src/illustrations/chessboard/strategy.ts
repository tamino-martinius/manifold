import type { Piece, StrategyKind } from "./types";

export interface PiecePicker {
  next(): Piece;
}

function roundRobin(pieces: Piece[]): PiecePicker {
  let i = -1;
  return {
    next() {
      i = (i + 1) % pieces.length;
      return pieces[i];
    },
  };
}

function weighted(pieces: Piece[]): PiecePicker {
  const acc = pieces.map(() => 0);
  const total = pieces.reduce((sum, p) => sum + Math.max(0, p.weight), 0);
  return {
    next() {
      let best = 0;
      for (let i = 0; i < pieces.length; i++) {
        acc[i] += Math.max(0, pieces[i].weight);
        if (acc[i] > acc[best]) best = i;
      }
      acc[best] -= total;
      return pieces[best];
    },
  };
}

export function createPicker(kind: StrategyKind, pieces: Piece[]): PiecePicker {
  if (pieces.length === 0) throw new Error("createPicker requires at least one piece");
  return kind === "weighted" ? weighted(pieces) : roundRobin(pieces);
}
