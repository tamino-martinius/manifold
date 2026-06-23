import { describe, expect, it } from "vitest";
import { coordToIndex, indexToCoord, spiralCoords } from "./spiral";

// Counter-clockwise square spiral: 1=(0,0), 2=(1,0) then CCW.
const EXPECTED: [number, number][] = [
  [0, 0], // 1
  [1, 0], // 2
  [1, 1], // 3
  [0, 1], // 4
  [-1, 1], // 5
  [-1, 0], // 6
  [-1, -1], // 7
  [0, -1], // 8
  [1, -1], // 9
  [2, -1], // 10
  [2, 0], // 11
  [2, 1], // 12
  [2, 2], // 13
  [1, 2], // 14
  [0, 2], // 15
];

describe("spiral", () => {
  it("produces the CCW spiral coordinates", () => {
    const coords = spiralCoords(EXPECTED.length);
    expect(coords.map((c) => [c.x, c.y])).toEqual(EXPECTED);
  });

  it("indexToCoord matches the table (1-based)", () => {
    EXPECTED.forEach(([x, y], i) => {
      expect(indexToCoord(i + 1)).toEqual({ x, y });
    });
  });

  it("coordToIndex is the inverse of indexToCoord", () => {
    for (let n = 1; n <= 200; n++) {
      const c = indexToCoord(n);
      expect(coordToIndex(c.x, c.y)).toBe(n);
    }
  });
});
