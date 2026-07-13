import { type Board, cellKey } from "./gorules";
import type { GoData } from "./types";

/**
 * A cursor over the move-delta stream that maintains the live board (cellKey ->
 * colorIdx). `seekTo(t)` steps forward/backward from the current head to move t,
 * applying (place + remove captures) forward and inverting (remove place +
 * restore captures) backward — O(distance) per seek, near-free during playback.
 */
export function createSeeker(data: GoData): {
  board: Board;
  head(): number;
  seekTo(target: number): void;
} {
  const board: Board = new Map();
  let head = 0; // number of moves applied

  const apply = (m: number): void => {
    board.set(cellKey(data.placedX[m], data.placedY[m]), data.placedColor[m]);
    for (let k = data.capOffset[m]; k < data.capOffset[m + 1]; k++) {
      board.delete(cellKey(data.capX[k], data.capY[k]));
    }
  };
  const invert = (m: number): void => {
    board.delete(cellKey(data.placedX[m], data.placedY[m]));
    for (let k = data.capOffset[m]; k < data.capOffset[m + 1]; k++) {
      board.set(cellKey(data.capX[k], data.capY[k]), data.capColor[k]);
    }
  };

  return {
    board,
    head: () => head,
    seekTo(target: number) {
      const t = Math.max(0, Math.min(Math.floor(target), data.count));
      while (head < t) apply(head++);
      while (head > t) invert(--head);
    },
  };
}
