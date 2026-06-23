import { describe, expect, it } from "vitest";
import { fitCamera, worldToScreen } from "./camera";
import type { Coord } from "./types";

describe("camera", () => {
  it("centers a single cell with padding", () => {
    const coords: Coord[] = [{ x: 0, y: 0 }];
    const cam = fitCamera(coords, 200, 200, 1);
    // content spans x:[-1,1], y:[-1,1] => 3 cells wide; scale = 200/3
    expect(cam.scale).toBeCloseTo(200 / 3, 5);
    const { sx, sy } = worldToScreen(cam, 0, 0);
    expect(sx).toBeCloseTo(100, 5);
    expect(sy).toBeCloseTo(100, 5);
  });

  it("fits a wide bounding box to the limiting dimension", () => {
    const coords: Coord[] = [
      { x: -5, y: 0 },
      { x: 5, y: 0 },
    ];
    const cam = fitCamera(coords, 400, 100, 0);
    // width spans 11 cells (x -5.5..5.5), height 1 cell. Limiting = min(400/11, 100/1).
    expect(cam.scale).toBeCloseTo(Math.min(400 / 11, 100 / 1), 5);
    const left = worldToScreen(cam, -5, 0);
    const right = worldToScreen(cam, 5, 0);
    expect(right.sx).toBeGreaterThan(left.sx);
  });

  it("does not divide by zero for empty input", () => {
    const cam = fitCamera([], 200, 200, 2);
    expect(Number.isFinite(cam.scale)).toBe(true);
    expect(cam.scale).toBeGreaterThan(0);
  });

  it("keeps the origin (cell 1) at the canvas center for off-center coords", () => {
    // All coords are to the right of the origin; the origin must still be centered.
    const cam = fitCamera(
      [
        { x: 2, y: 0 },
        { x: 4, y: 0 },
      ],
      200,
      200,
      0,
    );
    const origin = worldToScreen(cam, 0, 0);
    expect(origin.sx).toBeCloseTo(100, 5);
    expect(origin.sy).toBeCloseTo(100, 5);
    // The farthest cell stays within the canvas (fit from the origin, not the bbox).
    const far = worldToScreen(cam, 4, 0);
    expect(far.sx).toBeLessThanOrEqual(200);
    expect(far.sx).toBeGreaterThanOrEqual(0);
  });
});
