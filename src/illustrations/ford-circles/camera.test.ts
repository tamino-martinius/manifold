import { describe, expect, it } from "vitest";
import { easeScale, fitInterval, screenToWorld, worldToScreen } from "./camera";

describe("fitInterval", () => {
  it("uses a single shared scale so a world circle maps to a round on-screen circle", () => {
    const cam = fitInterval(0, 1, 0.5, 800, 400, 0);
    const r = 0.1;
    const cx = 0.5;
    const cy = 0.2;
    const rx = (worldToScreen(cam, cx + r, cy).sx - worldToScreen(cam, cx - r, cy).sx) / 2;
    const ry = (worldToScreen(cam, cx, cy - r).sy - worldToScreen(cam, cx, cy + r).sy) / 2;
    expect(rx).toBeCloseTo(ry, 9); // equal radii in x and y → perfectly round
    expect(rx).toBeCloseTo(r * cam.scale, 9);
  });

  it("fits whichever dimension is limiting (interval width vs tallest circle)", () => {
    // Wide, short canvas → the tallest circle (yMax) limits the scale.
    const short = fitInterval(0, 1, 0.5, 1000, 100, 0);
    expect(short.scale).toBeCloseTo(Math.min(1000 / 1, 100 / 0.5), 9);
    // Tall, narrow canvas → the interval width limits the scale.
    const tall = fitInterval(0, 1, 0.5, 300, 1000, 0);
    expect(tall.scale).toBeCloseTo(Math.min(300 / 1, 1000 / 0.5), 9);
  });

  it("pins world a to the left edge + pad and world y=0 near the canvas bottom", () => {
    const cam = fitInterval(0, 1, 0.5, 800, 400, 12);
    expect(worldToScreen(cam, 0, 0).sx).toBeCloseTo(12, 9); // a → left + pad
    expect(worldToScreen(cam, 0.37, 0).sy).toBeCloseTo(400 - 12, 9); // y=0 → bottom - pad
  });

  it("flips screen-y: higher world y → smaller sy", () => {
    const cam = fitInterval(0, 1, 0.5, 800, 400, 0);
    expect(worldToScreen(cam, 0.5, 1).sy).toBeLessThan(worldToScreen(cam, 0.5, 0).sy);
  });

  it("screenToWorld inverts worldToScreen", () => {
    const cam = fitInterval(0, 1, 0.5, 800, 400, 10);
    const { sx, sy } = worldToScreen(cam, 0.42, 0.13);
    const { wx, wy } = screenToWorld(cam, sx, sy);
    expect(wx).toBeCloseTo(0.42, 9);
    expect(wy).toBeCloseTo(0.13, 9);
  });

  it("stays finite for a degenerate (zero-width) interval", () => {
    const cam = fitInterval(2, 2, 0.5, 800, 400, 8);
    expect(Number.isFinite(cam.scale)).toBe(true);
    expect(cam.scale).toBeGreaterThan(0);
  });
});

describe("easeScale (re-exported from chessboard)", () => {
  it("snaps from the 0 sentinel and eases partway otherwise", () => {
    expect(easeScale(0, 42, 0.016)).toBe(42);
    const next = easeScale(10, 20, 0.016, 8);
    expect(next).toBeGreaterThan(10);
    expect(next).toBeLessThan(20);
  });
});
