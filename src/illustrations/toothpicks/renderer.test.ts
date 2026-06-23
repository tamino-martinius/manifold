import { describe, expect, it } from "vitest";
import { strokeWidthFor } from "./renderer";

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
