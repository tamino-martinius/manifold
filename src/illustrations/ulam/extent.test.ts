import { describe, expect, it } from "vitest";
import { indexToCoord } from "../chessboard/spiral";
import { createExtentTracker, spiralExtent } from "./extent";

// Brute-force half-extent from the canonical spiral coordinates.
const brute = (count: number): { halfX: number; halfY: number } => {
  let halfX = 0;
  let halfY = 0;
  for (let n = 1; n <= count; n++) {
    const c = indexToCoord(n);
    halfX = Math.max(halfX, Math.abs(c.x));
    halfY = Math.max(halfY, Math.abs(c.y));
  }
  return { halfX, halfY };
};

describe("spiralExtent", () => {
  it("is {0,0} at the origin", () => {
    expect(spiralExtent(0)).toEqual({ halfX: 0, halfY: 0 });
    expect(spiralExtent(1)).toEqual({ halfX: 0, halfY: 0 });
  });

  it("matches the brute-force spiral extent for 1..300", () => {
    for (let count = 1; count <= 300; count++) {
      expect(spiralExtent(count)).toEqual(brute(count));
    }
  });
});

describe("createExtentTracker", () => {
  it("advances incrementally to the same result as a fresh walk", () => {
    const t = createExtentTracker();
    for (const count of [1, 2, 9, 25, 50, 121, 200]) {
      expect(t.to(count)).toEqual(spiralExtent(count));
    }
  });

  it("resets when asked for fewer cells than already walked", () => {
    const t = createExtentTracker();
    t.to(200);
    expect(t.to(9)).toEqual(spiralExtent(9));
  });
});
