import { describe, expect, it } from "vitest";
import { DIR_COUNT, UNIT, addPt, pointKey, pointToScreen, rotateDir, rotatePt } from "./geometry";
import type { Pt } from "./types";

const E: Pt = { p: 1, q: 0, r: 0, s: 0 };

describe("rotatePt", () => {
  it("returns to identity after a full turn", () => {
    expect(rotatePt(E, 0)).toEqual(E);
    expect(rotatePt(rotatePt(E, 4), 4)).toEqual(E); // 8 eighth-turns total
  });
  it("maps E -> NE -> N -> NW -> W around the octagon", () => {
    expect(rotatePt(E, 1)).toEqual({ p: 0, q: 1, r: 0, s: 0 }); // NE
    expect(rotatePt(E, 2)).toEqual({ p: 0, q: 0, r: 1, s: 0 }); // N
    expect(rotatePt(E, 3)).toEqual({ p: 0, q: 0, r: 0, s: 1 }); // NW
    expect(rotatePt(E, 4)).toEqual({ p: -1, q: 0, r: 0, s: 0 }); // W
  });
  it("90° (by=2) on an axis point matches (x,y)->(-y,x)", () => {
    const p: Pt = { p: 3, q: 0, r: 1, s: 0 }; // screen (3,1)
    expect(pointToScreen(rotatePt(p, 2))).toEqual({ x: -1, y: 3 });
  });
});

describe("UNIT + DIR_COUNT", () => {
  it("has 8 directions whose screen vectors are the king moves", () => {
    expect(DIR_COUNT).toBe(8);
    expect(pointToScreen(UNIT[0])).toEqual({ x: 1, y: 0 }); // E
    const ne = pointToScreen(UNIT[1]); // NE
    expect(ne.x).toBeCloseTo(Math.SQRT1_2);
    expect(ne.y).toBeCloseTo(Math.SQRT1_2);
    expect(pointToScreen(UNIT[2])).toEqual({ x: 0, y: 1 }); // N
  });
});

describe("rotateDir", () => {
  it("composes modulo 8", () => {
    expect(rotateDir(2, 2)).toBe(4);
    expect(rotateDir(6, 4)).toBe(2);
    expect(rotateDir(7, 1)).toBe(0);
  });
});

describe("addPt", () => {
  it("sums components", () => {
    expect(addPt({ p: 1, q: 2, r: 3, s: 4 }, { p: -1, q: 1, r: 0, s: -2 })).toEqual({
      p: 0,
      q: 3,
      r: 3,
      s: 2,
    });
  });
});

describe("pointKey", () => {
  it("is unique per point incl. negatives and diagonals, within safe-int range", () => {
    expect(pointKey({ p: 0, q: 0, r: 0, s: 0 })).not.toBe(pointKey({ p: 1, q: 0, r: 0, s: 0 }));
    expect(pointKey({ p: 0, q: 1, r: 0, s: 0 })).not.toBe(pointKey({ p: 0, q: 0, r: 0, s: 1 }));
    expect(pointKey({ p: -3, q: 4, r: -5, s: 6 })).toBe(pointKey({ p: -3, q: 4, r: -5, s: 6 }));
    expect(pointKey({ p: 4000, q: 4000, r: 4000, s: 4000 })).toBeLessThan(Number.MAX_SAFE_INTEGER);
  });
});
