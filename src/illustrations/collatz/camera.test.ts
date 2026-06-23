import { describe, expect, it } from "vitest";
import { fitBounds, fitScale } from "./camera";

describe("fitScale", () => {
  it("fits the limiting dimension with padding", () => {
    // Box spans 10 wide, 2 tall into a 400x100 canvas, 0 padding.
    const scale = fitScale(-5, 5, -1, 1, 400, 100, 0);
    expect(scale).toBeCloseTo(Math.min(400 / 10, 100 / 2), 6);
  });

  it("never divides by zero for a degenerate (single-point) box", () => {
    const scale = fitScale(3, 3, 7, 7, 200, 200, 0.06);
    expect(Number.isFinite(scale)).toBe(true);
    expect(scale).toBeGreaterThan(0);
  });
});

describe("fitBounds", () => {
  it("maps the box midpoint to the canvas center", () => {
    // Off-center box: x in [2,6] (mid 4), y in [0,10] (mid 5).
    const cam = fitBounds(2, 6, 0, 10, 300, 200, 0);
    const sx = 4 * cam.scale + cam.offsetX;
    const sy = -5 * cam.scale + cam.offsetY;
    expect(sx).toBeCloseTo(150, 6);
    expect(sy).toBeCloseTo(100, 6);
  });

  it("flips y so higher world-y is higher on screen (smaller screen-y)", () => {
    const cam = fitBounds(0, 10, 0, 10, 200, 200, 0);
    const low = -2 * cam.scale + cam.offsetY; // world y = 2
    const high = -8 * cam.scale + cam.offsetY; // world y = 8
    expect(high).toBeLessThan(low);
  });
});
