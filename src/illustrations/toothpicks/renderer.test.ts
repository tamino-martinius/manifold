import { describe, expect, it } from "vitest";
import { revealSlices, strokeWidthFor } from "./renderer";

describe("strokeWidthFor", () => {
  it("has a visible minimum when zoomed far out", () => {
    expect(strokeWidthFor(0)).toBe(0.75);
    expect(strokeWidthFor(1)).toBe(0.75);
  });
  it("scales with the cell size when zoomed in", () => {
    expect(strokeWidthFor(100)).toBeCloseTo(16);
    expect(strokeWidthFor(50)).toBeGreaterThan(strokeWidthFor(10));
  });
});

describe("revealSlices", () => {
  const gse = [2, 5, 9]; // 3 generations of 2, 3, 4 segments

  it("reveals nothing at frame 0", () => {
    expect(revealSlices(gse, 0)).toEqual({ solidEnd: 0, outlineStart: 0, outlineEnd: 0 });
  });
  it("draws the first generation entirely as the frontier", () => {
    expect(revealSlices(gse, 1)).toEqual({ solidEnd: 0, outlineStart: 0, outlineEnd: 2 });
  });
  it("draws a solid prefix plus the latest generation as the frontier", () => {
    expect(revealSlices(gse, 2)).toEqual({ solidEnd: 2, outlineStart: 2, outlineEnd: 5 });
  });
  it("clamps past the end and keeps the last generation as the frontier", () => {
    expect(revealSlices(gse, 99)).toEqual({ solidEnd: 5, outlineStart: 5, outlineEnd: 9 });
  });
});
