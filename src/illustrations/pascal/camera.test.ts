import { describe, expect, it } from "vitest";
import { fitBounds, worldToScreen } from "./camera";

describe("pascal fitBounds", () => {
  it("centers the apex column (world x = 0) on the canvas X", () => {
    const cam = fitBounds(64, 800, 600, 2);
    const apex = worldToScreen(cam, 0, 0);
    expect(apex.sx).toBeCloseTo(400, 5);
  });

  it("pins the apex `padding` below the top edge (down-growing y)", () => {
    const padding = 3;
    const cam = fitBounds(64, 800, 600, padding);
    const apex = worldToScreen(cam, 0, 0);
    // apex screen-y = padding * scale (no negation — y grows downward)
    expect(apex.sy).toBeCloseTo(padding * cam.scale, 5);
    // a deeper row draws strictly lower on screen
    const deeper = worldToScreen(cam, 0, 32);
    expect(deeper.sy).toBeGreaterThan(apex.sy);
  });

  it("revealing more rows shrinks the scale", () => {
    const small = fitBounds(16, 800, 600, 2);
    const large = fitBounds(256, 800, 600, 2);
    expect(large.scale).toBeLessThan(small.scale);
  });

  it("fits the wider extent (does not overflow the canvas)", () => {
    const cam = fitBounds(100, 800, 600, 0);
    // widest row spans x ∈ [-50, 50] → 100 wide; height spans y ∈ [0, 100].
    // limiting dimension = min(800/100, 600/100) = 6.
    expect(cam.scale).toBeCloseTo(Math.min(800 / 100, 600 / 100), 5);
    const leftEdge = worldToScreen(cam, -50, 0);
    const rightEdge = worldToScreen(cam, 50, 0);
    expect(leftEdge.sx).toBeGreaterThanOrEqual(0);
    expect(rightEdge.sx).toBeLessThanOrEqual(800);
  });

  it("never divides by zero for a single revealed row", () => {
    const cam = fitBounds(1, 200, 200, 2);
    expect(Number.isFinite(cam.scale)).toBe(true);
    expect(cam.scale).toBeGreaterThan(0);
  });
});
