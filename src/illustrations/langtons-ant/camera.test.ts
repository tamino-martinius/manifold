import { describe, expect, it } from "vitest";
import { fitBounds, followAnt, worldToScreen } from "./camera";

describe("fitBounds", () => {
  it("centers a single painted cell with padding", () => {
    const cam = fitBounds(0, 0, 0, 0, 200, 200, 1);
    // box is 1 cell + 1 pad each side => 3 cells wide. scale = 200/3.
    expect(cam.scale).toBeCloseTo(200 / 3, 5);
    const c = worldToScreen(cam, 0, 0);
    expect(c.sx).toBeCloseTo(100, 5);
    expect(c.sy).toBeCloseTo(100, 5);
  });

  it("centers an off-origin box and keeps it on canvas", () => {
    // Langton's painted region is NOT origin-centered: box x in [2,4].
    const cam = fitBounds(2, 4, 0, 0, 200, 200, 0);
    // width spans 3 cells (x 1.5..4.5), height 1; scale = min(200/3, 200/1).
    expect(cam.scale).toBeCloseTo(200 / 3, 5);
    const center = worldToScreen(cam, 3, 0); // box center -> canvas center
    expect(center.sx).toBeCloseTo(100, 5);
    expect(center.sy).toBeCloseTo(100, 5);
    const left = worldToScreen(cam, 2, 0);
    const right = worldToScreen(cam, 4, 0);
    expect(left.sx).toBeGreaterThanOrEqual(0);
    expect(right.sx).toBeLessThanOrEqual(200);
  });

  it("fits a wide box to the limiting dimension", () => {
    const cam = fitBounds(-5, 5, 0, 0, 400, 100, 0);
    // width 11 cells, height 1 cell => limiting = min(400/11, 100/1).
    expect(cam.scale).toBeCloseTo(Math.min(400 / 11, 100 / 1), 5);
  });

  it("never divides by zero for a degenerate box", () => {
    const cam = fitBounds(0, 0, 0, 0, 200, 200, 0);
    expect(Number.isFinite(cam.scale)).toBe(true);
    expect(cam.scale).toBeGreaterThan(0);
  });
});

describe("followAnt", () => {
  it("centers the ant at the requested cells-per-screen", () => {
    const cam = followAnt(10, -4, 20, 200, 200);
    // 20 cells across the smaller (200px) dimension => scale 10px/cell.
    expect(cam.scale).toBeCloseTo(10, 5);
    const at = worldToScreen(cam, 10, -4);
    expect(at.sx).toBeCloseTo(100, 5);
    expect(at.sy).toBeCloseTo(100, 5);
  });
});
