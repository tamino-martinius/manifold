import { describe, expect, it } from "vitest";
import { type Board, cellKey, groupInfo, keyX, keyY, resolveMove } from "./gorules";

const boardOf = (stones: [number, number, number][]): Board => {
  const b: Board = new Map();
  for (const [x, y, c] of stones) b.set(cellKey(x, y), c);
  return b;
};

describe("cellKey", () => {
  it("round-trips coordinates including negatives", () => {
    for (const [x, y] of [
      [0, 0],
      [5, -3],
      [-7, 9],
      [-511, 511],
    ]) {
      const k = cellKey(x, y);
      expect(keyX(k)).toBe(x);
      expect(keyY(k)).toBe(y);
    }
  });

  it("is unique per coordinate", () => {
    const seen = new Set<number>();
    for (let x = -20; x <= 20; x++)
      for (let y = -20; y <= 20; y++) {
        const k = cellKey(x, y);
        expect(seen.has(k)).toBe(false);
        seen.add(k);
      }
  });
});

describe("groupInfo", () => {
  it("counts liberties of a lone stone", () => {
    const b = boardOf([[0, 0, 0]]);
    const g = groupInfo(b, 0, 0, 0);
    expect(g.stones).toHaveLength(1);
    expect(g.liberties).toBe(4);
  });

  it("merges connected same-color stones and shares liberties", () => {
    const b = boardOf([
      [0, 0, 0],
      [1, 0, 0],
    ]);
    const g = groupInfo(b, 0, 0, 0);
    expect(g.stones).toHaveLength(2);
    expect(g.liberties).toBe(6); // 2 stones × 4 − 2 shared internal = 6 distinct empties
  });

  it("does not count enemy-occupied neighbours as liberties", () => {
    const b = boardOf([
      [0, 0, 0],
      [1, 0, 1],
    ]);
    expect(groupInfo(b, 0, 0, 0).liberties).toBe(3);
  });
});

describe("resolveMove", () => {
  it("captures a single enemy stone reduced to zero liberties", () => {
    // White (1) at origin, black (0) on 3 sides; black plays the 4th and captures.
    const b = boardOf([
      [0, 0, 1],
      [1, 0, 0],
      [-1, 0, 0],
      [0, 1, 0],
    ]);
    const r = resolveMove(b, 0, -1, 0);
    expect(r.legal).toBe(true);
    expect(r.captured).toEqual([cellKey(0, 0)]);
    expect(b.has(cellKey(0, 0))).toBe(true); // resolveMove must NOT mutate
    expect(b.has(cellKey(0, -1))).toBe(false);
  });

  it("captures a multi-stone enemy group at once", () => {
    // White group {(0,0),(1,0)} fully surrounded by black except one point; black fills it.
    const b = boardOf([
      [0, 0, 1],
      [1, 0, 1],
      [-1, 0, 0],
      [0, 1, 0],
      [1, 1, 0],
      [2, 0, 0],
      [1, -1, 0],
    ]);
    const r = resolveMove(b, 0, -1, 0);
    expect(r.legal).toBe(true);
    expect(new Set(r.captured)).toEqual(new Set([cellKey(0, 0), cellKey(1, 0)]));
  });

  it("rejects suicide (no liberties, no capture)", () => {
    // Black surrounds an empty point on all 4 sides; white plays into it — suicide.
    const b = boardOf([
      [1, 0, 0],
      [-1, 0, 0],
      [0, 1, 0],
      [0, -1, 0],
    ]);
    const r = resolveMove(b, 0, 0, 1);
    expect(r.legal).toBe(false);
    expect(r.captured).toEqual([]);
    expect(b.has(cellKey(0, 0))).toBe(false); // unchanged
  });

  it("allows an otherwise-suicidal move BECAUSE it captures (capture resolved first)", () => {
    // White plays (0,0) with all four neighbours black, so its lone stone has
    // zero liberties on its own. The black stone at (1,0) is in atari (its only
    // liberty is (0,0)), so the move captures it and (0,0) gains that liberty.
    // The other three black stones keep outside liberties, so they survive and
    // are NOT captured. A suicide-before-capture implementation would wrongly
    // reject this move — that is the ordering this test locks down.
    const b = boardOf([
      [1, 0, 0], // black in atari — the only stone captured
      [-1, 0, 0],
      [0, 1, 0],
      [0, -1, 0],
      [2, 0, 1],
      [1, 1, 1],
      [1, -1, 1],
    ]);
    const r = resolveMove(b, 0, 0, 1);
    expect(r.legal).toBe(true);
    expect(r.captured).toEqual([cellKey(1, 0)]);
    expect(b.has(cellKey(1, 0))).toBe(true); // resolveMove must not mutate
  });
});
