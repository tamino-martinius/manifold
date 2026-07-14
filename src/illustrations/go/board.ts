import { type Board, cellKey } from "./gorules";
import type { GoData } from "./types";

/**
 * A cursor over the move-delta stream that maintains the live board (cellKey ->
 * colorIdx) plus a derived `territory` view (cellKey -> capturing colorIdx for
 * cells that were captured and are still empty). `seekTo(t)` steps forward/backward
 * from the current head, O(distance) per seek. Backward steps stay exact because
 * each apply records the territory value it overwrote at the placed cell
 * (`undoTerr`), restored on invert.
 */
export function createSeeker(data: GoData): {
  board: Board;
  territory: Board;
  head(): number;
  seekTo(target: number): void;
} {
  const board: Board = new Map();
  const territory: Board = new Map();
  const undoTerr: (number | undefined)[] = new Array(data.count);
  let head = 0; // number of moves applied

  const apply = (m: number): void => {
    const capturer = data.placedColor[m];
    const pk = cellKey(data.placedX[m], data.placedY[m]);
    undoTerr[m] = territory.get(pk); // remember prior territory at the placed cell
    territory.delete(pk); // a live stone is not territory
    board.set(pk, capturer);
    for (let k = data.capOffset[m]; k < data.capOffset[m + 1]; k++) {
      const ck = cellKey(data.capX[k], data.capY[k]);
      board.delete(ck);
      territory.set(ck, capturer); // capturing color owns the vacated cell
    }
  };
  const invert = (m: number): void => {
    for (let k = data.capOffset[m]; k < data.capOffset[m + 1]; k++) {
      const ck = cellKey(data.capX[k], data.capY[k]);
      board.set(ck, data.capColor[k]);
      territory.delete(ck); // occupied again — no longer territory
    }
    const pk = cellKey(data.placedX[m], data.placedY[m]);
    board.delete(pk);
    const prev = undoTerr[m];
    if (prev === undefined) territory.delete(pk);
    else territory.set(pk, prev);
  };

  return {
    board,
    territory,
    head: () => head,
    seekTo(target: number) {
      const t = Math.max(0, Math.min(Math.floor(target), data.count));
      while (head < t) apply(head++);
      while (head > t) invert(--head);
    },
  };
}
