import { describe, expect, it } from "vitest";
import { easeScale, fitBounds, worldToScreen } from "./camera";

describe("fitBounds", () => {
  it("fits the limiting dimension (here the vertical arc height)", () => {
    // worldW = 10, worldH = 2*1 = 2 → scale = min(100/10, 100/2) = 10.
    const cam = fitBounds(0, 10, 1, 100, 100, 0);
    expect(cam.scale).toBeCloseTo(10, 5);
  });

  it("accounts for padding on both axes", () => {
    // worldW = 10 + 2*2 = 14, worldH = 2*1 + 2*2 = 6 → scale = min(140/14, 60/6) = 10.
    const cam = fitBounds(0, 10, 1, 140, 60, 2);
    expect(cam.scale).toBeCloseTo(10, 5);
  });

  it("centers the x-range on the canvas", () => {
    const cam = fitBounds(0, 10, 1, 200, 200, 0);
    const center = worldToScreen(cam, 5, 0); // world center x = (0+10)/2
    expect(center.sx).toBeCloseTo(100, 5);
  });

  it("pins world y=0 to the vertical canvas center", () => {
    const cam = fitBounds(0, 40, 5, 300, 200, 1);
    const onLine = worldToScreen(cam, 17, 0);
    expect(onLine.sy).toBeCloseTo(100, 5);
  });

  it("flips screen-y so positive world y is higher on screen (smaller sy)", () => {
    const cam = fitBounds(0, 10, 2, 200, 200, 0);
    const up = worldToScreen(cam, 5, 2); // above the line
    const onLine = worldToScreen(cam, 5, 0);
    expect(up.sy).toBeLessThan(onLine.sy);
  });

  it("does not produce a non-finite scale for a zero-width range", () => {
    const cam = fitBounds(0, 0, 0, 200, 200, 4);
    expect(Number.isFinite(cam.scale)).toBe(true);
    expect(cam.scale).toBeGreaterThan(0);
  });
});

describe("easeScale (re-exported)", () => {
  it("snaps to the target from the 0 sentinel", () => {
    expect(easeScale(0, 42, 0.016)).toBe(42);
  });
});
