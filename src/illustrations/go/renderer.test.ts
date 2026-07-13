import { describe, expect, it } from "vitest";
import { boardLineAlpha, smoothstep, stoneGeometry, stoneOutlineAlpha } from "./renderer";

describe("smoothstep", () => {
  it("clamps and eases between edges", () => {
    expect(smoothstep(0, 10, -5)).toBe(0);
    expect(smoothstep(0, 10, 15)).toBe(1);
    expect(smoothstep(0, 10, 5)).toBeCloseTo(0.5, 5);
  });
});

describe("LOD alphas", () => {
  it("board lines fade in with zoom", () => {
    expect(boardLineAlpha(6)).toBe(0);
    expect(boardLineAlpha(24)).toBe(1);
    expect(boardLineAlpha(14)).toBeGreaterThan(0);
  });
  it("stone outline fades in with zoom", () => {
    expect(stoneOutlineAlpha(10)).toBe(0);
    expect(stoneOutlineAlpha(24)).toBe(1);
  });
});

describe("stoneGeometry", () => {
  it("is a full circle when zoomed in (radius === size/2)", () => {
    const g = stoneGeometry(24);
    expect(g.radius).toBeCloseTo(g.size / 2, 5);
  });
  it("is a sharp square when zoomed far out (radius === 0)", () => {
    expect(stoneGeometry(3).radius).toBe(0);
  });
  it("grows toward a full cell as it squares off", () => {
    // Zoomed in the footprint is ~0.84 of the cell; zoomed out it exceeds that.
    expect(stoneGeometry(3).size / 3).toBeGreaterThan(0.84);
    expect(stoneGeometry(24).size / 24).toBeCloseTo(0.84, 2);
  });
});
