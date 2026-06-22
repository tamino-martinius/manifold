import { describe, expect, it } from "vitest";
import { defaultPieces, gridCells, gridRadius, knightOffsets, offsetKey } from "./pieces";

describe("pieces", () => {
  it("knightOffsets returns the 8 L-shaped moves", () => {
    const set = new Set(knightOffsets().map(([x, y]) => offsetKey(x, y)));
    expect(set.size).toBe(8);
    for (const [x, y] of knightOffsets()) {
      expect(Math.abs(x) + Math.abs(y)).toBe(3);
      expect(Math.abs(x)).not.toBe(0);
      expect(Math.abs(y)).not.toBe(0);
    }
  });

  it("default pieces are a black knight then a red knight on 5x5", () => {
    const [black, red] = defaultPieces();
    expect(black.color).toBe("#000000");
    expect(red.color).toBe("#e10600");
    expect(black.gridSize).toBe(5);
    expect(red.gridSize).toBe(5);
    expect(black.offsets.length).toBe(8);
    expect(black.id).not.toBe(red.id);
  });

  it("gridCells excludes the center and has gridSize^2 - 1 cells", () => {
    const cells = gridCells(5);
    expect(cells.length).toBe(24);
    expect(cells.some(([x, y]) => x === 0 && y === 0)).toBe(false);
    expect(gridRadius(5)).toBe(2);
    expect(gridRadius(9)).toBe(4);
  });
});
