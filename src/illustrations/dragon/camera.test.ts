import { describe, expect, it } from "vitest";
import { fitBounds, framePrefix, tilingBounds, worldToScreen } from "./camera";
import { type DragonGeom, generateDragon } from "./dragon";

// Build a Float64Array path from [x,y] pairs (length = 2*(segments+1)).
function path(pairs: [number, number][]): Float64Array {
  const a = new Float64Array(pairs.length * 2);
  pairs.forEach(([x, y], i) => {
    a[2 * i] = x;
    a[2 * i + 1] = y;
  });
  return a;
}

describe("fitBounds", () => {
  it("centers the bounds box at the canvas center", () => {
    // Asymmetric box [0,10] x [0,4]; its center (5,2) must land at canvas center.
    const cam = fitBounds(0, 10, 0, 4, 200, 200, 0);
    const c = worldToScreen(cam, 5, 2);
    expect(c.sx).toBeCloseTo(100, 6);
    expect(c.sy).toBeCloseTo(100, 6);
  });

  it("uses one uniform scale (square aspect) limited by the tighter axis", () => {
    const cam = fitBounds(0, 10, 0, 4, 200, 200, 0);
    expect(cam.scale).toBeCloseTo(Math.min(200 / 10, 200 / 4), 6);
    // Equal world deltas map to equal-magnitude screen deltas → no distortion.
    const a = worldToScreen(cam, 0, 0);
    const bx = worldToScreen(cam, 1, 0);
    const by = worldToScreen(cam, 0, 1);
    expect(Math.abs(bx.sx - a.sx)).toBeCloseTo(Math.abs(by.sy - a.sy), 6);
  });

  it("adds world-unit padding around the content", () => {
    // 2-unit box with 1 unit of padding each side => fits a 4-unit world span.
    const cam = fitBounds(0, 2, 0, 2, 200, 100, 1);
    expect(cam.scale).toBeCloseTo(Math.min(200 / 4, 100 / 4), 6);
  });

  it("flips the y axis (screen y grows downward)", () => {
    const cam = fitBounds(-5, 5, -5, 5, 200, 200, 0);
    const up = worldToScreen(cam, 0, 1);
    const down = worldToScreen(cam, 0, -1);
    expect(up.sy).toBeLessThan(down.sy);
  });
});

describe("framePrefix", () => {
  // Unit square path: (0,0)->(1,0)->(1,1)->(0,1), i.e. 3 segments / 4 points.
  const square = path([
    [0, 0],
    [1, 0],
    [1, 1],
    [0, 1],
  ]);

  it("centroid and circumradii over the full square", () => {
    const f = framePrefix(square, 3);
    expect(f.cx).toBeCloseTo(0.5, 9);
    expect(f.cy).toBeCloseTo(0.5, 9);
    // farthest corner from the centroid is √0.5 away
    expect(f.rSingle).toBeCloseTo(Math.SQRT1_2, 9);
    // farthest point from the origin is (1,1) at √2
    expect(f.rTiling).toBeCloseTo(Math.SQRT2, 9);
  });

  it("uses only the first `segCount` segments (the prefix)", () => {
    // First segment only: points (0,0) and (1,0).
    const f = framePrefix(square, 1);
    expect(f.cx).toBeCloseTo(0.5, 9);
    expect(f.cy).toBeCloseTo(0, 9);
    expect(f.rSingle).toBeCloseTo(0.5, 9);
    expect(f.rTiling).toBeCloseTo(1, 9);
  });

  it("origin circumradius grows monotonically as the dragon prefix lengthens", () => {
    const g: DragonGeom = generateDragon(10);
    let prev = 0;
    for (let n = 1; n <= g.count; n *= 2) {
      const r = framePrefix(g.points, n).rTiling;
      expect(r).toBeGreaterThanOrEqual(prev - 1e-9);
      prev = r;
    }
  });
});

describe("tilingBounds", () => {
  it("unions the four 0/90/180/270 rotations about the origin", () => {
    const b = tilingBounds(0, 4, 0, 1);
    expect(b.minX).toBeCloseTo(-4, 9);
    expect(b.maxX).toBeCloseTo(4, 9);
    expect(b.minY).toBeCloseTo(-4, 9);
    expect(b.maxY).toBeCloseTo(4, 9);
  });
});
