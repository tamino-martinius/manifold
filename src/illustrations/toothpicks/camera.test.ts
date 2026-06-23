import { describe, expect, it } from "vitest";
import { easeScale, fitFromExtent, worldToScreen } from "./camera";

describe("fitFromExtent", () => {
  it("centers the origin on the canvas", () => {
    const cam = fitFromExtent(5, 5, 200, 100, 0);
    expect(cam.offsetX).toBe(100);
    expect(cam.offsetY).toBe(50);
  });
  it("scales to fit the limiting axis with half-cell padding", () => {
    const cam = fitFromExtent(4, 0, 100, 100, 0); // worldHalfW = 4 + 0.5
    expect(cam.scale).toBeCloseTo(100 / (2 * 4.5));
  });
});

describe("easeScale", () => {
  it("snaps from the zero sentinel", () => {
    expect(easeScale(0, 12, 0.016)).toBe(12);
  });
  it("moves toward but not past the target", () => {
    const v = easeScale(10, 20, 0.016);
    expect(v).toBeGreaterThan(10);
    expect(v).toBeLessThan(20);
  });
});

describe("worldToScreen", () => {
  it("flips y and applies scale + offset", () => {
    const p = worldToScreen({ scale: 2, offsetX: 50, offsetY: 50 }, 3, 4);
    expect(p.sx).toBe(56);
    expect(p.sy).toBe(42);
  });
});
