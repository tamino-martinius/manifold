import { describe, expect, it } from "vitest";
import { createSeeker } from "./board";
import { computeGoMoves } from "./compute";
import { cellKey } from "./gorules";

const BLACK = "#171717";
const WHITE = "#f4efe4";

function bruteBoard(data: ReturnType<typeof computeGoMoves>, n: number): Map<number, number> {
  const b = new Map<number, number>();
  for (let m = 0; m < n; m++) {
    b.set(cellKey(data.placedX[m], data.placedY[m]), data.placedColor[m]);
    for (let k = data.capOffset[m]; k < data.capOffset[m + 1]; k++)
      b.delete(cellKey(data.capX[k], data.capY[k]));
  }
  return b;
}
const same = (a: Map<number, number>, b: Map<number, number>): boolean =>
  a.size === b.size && [...a].every(([k, v]) => b.get(k) === v);

describe("createSeeker", () => {
  it("matches a brute-force replay seeking forward", () => {
    const data = computeGoMoves([BLACK, WHITE], 250);
    const s = createSeeker(data);
    for (const t of [0, 1, 8, 50, 137, 250]) {
      s.seekTo(t);
      expect(s.head()).toBe(t);
      expect(same(s.board, bruteBoard(data, t))).toBe(true);
    }
  });

  it("matches when seeking backward and clamps out-of-range targets", () => {
    const data = computeGoMoves([BLACK, WHITE], 250);
    const s = createSeeker(data);
    s.seekTo(250);
    for (const t of [200, 9, 0]) {
      s.seekTo(t);
      expect(same(s.board, bruteBoard(data, t))).toBe(true);
    }
    s.seekTo(-5);
    expect(s.head()).toBe(0);
    expect(s.board.size).toBe(0);
    s.seekTo(9999);
    expect(s.head()).toBe(250);
  });
});

// Brute-force the live board, captured-territory map, and per-color counts after
// the first `n` moves, independent of the seeker's incremental bookkeeping.
function bruteState(
  data: ReturnType<typeof computeGoMoves>,
  n: number,
): { board: Map<number, number>; territory: Map<number, number>; counts: number[] } {
  const board = new Map<number, number>();
  const territory = new Map<number, number>();
  const counts = new Array(data.colors.length).fill(0);
  for (let m = 0; m < n; m++) {
    const pk = cellKey(data.placedX[m], data.placedY[m]);
    territory.delete(pk);
    board.set(pk, data.placedColor[m]);
    counts[data.placedColor[m]]++;
    for (let k = data.capOffset[m]; k < data.capOffset[m + 1]; k++) {
      const ck = cellKey(data.capX[k], data.capY[k]);
      board.delete(ck);
      counts[data.capColor[k]]--;
      territory.set(ck, data.placedColor[m]);
    }
  }
  return { board, territory, counts };
}
const sameMap = (a: Map<number, number>, b: Map<number, number>): boolean =>
  a.size === b.size && [...a].every(([k, v]) => b.get(k) === v);

describe("createSeeker territory + counts", () => {
  it("matches brute-force territory and counts seeking forward and backward", () => {
    const data = computeGoMoves([BLACK, WHITE, "#cf2f2a"], 400);
    const s = createSeeker(data);
    for (const t of [0, 1, 8, 50, 200, 400, 137, 3, 400, 0]) {
      s.seekTo(t);
      const brute = bruteState(data, t);
      expect(sameMap(s.territory, brute.territory)).toBe(true);
      expect([...s.counts]).toEqual(brute.counts);
    }
  });

  it("keeps counts non-negative and equal to live board stones per color", () => {
    const data = computeGoMoves([BLACK, WHITE], 250);
    const s = createSeeker(data);
    for (const t of [0, 30, 130, 250]) {
      s.seekTo(t);
      const perColor = new Array(data.colors.length).fill(0);
      for (const [, c] of s.board) perColor[c]++;
      expect([...s.counts]).toEqual(perColor);
      expect([...s.counts].every((n) => n >= 0)).toBe(true);
      expect([...s.counts].reduce((a, b) => a + b, 0)).toBe(s.board.size);
    }
  });
});
