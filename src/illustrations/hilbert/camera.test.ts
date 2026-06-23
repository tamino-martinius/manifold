import { describe, expect, it } from "vitest";
import { anchoredCamera, fitAnchoredScale, fitBounds, worldToScreen } from "./camera";

const START = { x: 0.5, y: 0.5 }; // path start: cell center of (0,0)

describe("anchored auto-zoom camera", () => {
  it("pins the path start point to the same screen position at any scale", () => {
    const a = anchoredCamera(10, 800, 600);
    const b = anchoredCamera(60, 800, 600);
    const pa = worldToScreen(a, START.x, START.y);
    const pb = worldToScreen(b, START.x, START.y);
    expect(pa.sx).toBeCloseTo(pb.sx);
    expect(pa.sy).toBeCloseTo(pb.sy);
  });

  it("anchors the start point in the bottom-left region of the canvas", () => {
    const cam = anchoredCamera(20, 800, 600);
    const p = worldToScreen(cam, START.x, START.y);
    expect(p.sx).toBeLessThan(800 / 2); // left half
    expect(p.sy).toBeGreaterThan(600 / 2); // bottom half (screen-y grows downward)
  });

  it("zooms out (smaller scale) as the revealed extent grows", () => {
    const small = fitAnchoredScale(3, 3, 800, 600);
    const big = fitAnchoredScale(63, 63, 800, 600);
    expect(big).toBeLessThan(small);
  });

  it("keeps the revealed box on-canvas (near corner and far corner both fit)", () => {
    const maxX = 20;
    const maxY = 20;
    const W = 800;
    const H = 600;
    const cam = anchoredCamera(fitAnchoredScale(maxX, maxY, W, H), W, H);
    const near = worldToScreen(cam, 0, 0); // bottom-left grid corner
    const far = worldToScreen(cam, maxX + 1, maxY + 1); // top-right of revealed box
    expect(near.sx).toBeGreaterThanOrEqual(0);
    expect(near.sy).toBeLessThanOrEqual(H);
    expect(far.sx).toBeLessThanOrEqual(W);
    expect(far.sy).toBeGreaterThanOrEqual(0);
  });
});

describe("fitBounds", () => {
  it("centers the grid box at the canvas center (via the y-flip worldToScreen)", () => {
    // order-1 grid: cells 0..1 in both axes, no padding.
    const cam = fitBounds(0, 1, 0, 1, 400, 200, 0);
    const cx = (0 + 1 + 1) / 2; // world center x (cells span their full unit)
    const cy = (0 + 1 + 1) / 2;
    const { sx, sy } = worldToScreen(cam, cx, cy);
    expect(sx).toBeCloseTo(200);
    expect(sy).toBeCloseTo(100);
  });

  it("uses one shared scale for both axes (square, no aspect stretch)", () => {
    // A square box must render square on any canvas — scale is a single number.
    const cam = fitBounds(0, 3, 0, 3, 600, 240, 1);
    const left = worldToScreen(cam, 0, 0).sx;
    const right = worldToScreen(cam, 4, 0).sx; // right edge of cell 3
    const top = worldToScreen(cam, 0, 4).sy;
    const bottom = worldToScreen(cam, 0, 0).sy;
    expect(right - left).toBeCloseTo(bottom - top); // square on screen
  });

  it("fits the box within the canvas, limited by the smaller axis", () => {
    // Wide canvas: height is the limiting dimension. worldH = (3-0)+1+2*1 = 6.
    const cam = fitBounds(0, 3, 0, 3, 600, 240, 1);
    expect(cam.scale).toBeCloseTo(240 / 6); // = 40
    // The padded box never exceeds the canvas in the limiting axis.
    const top = worldToScreen(cam, 0, 4).sy;
    const bottom = worldToScreen(cam, 0, 0).sy;
    expect(bottom - top).toBeLessThanOrEqual(240 + 1e-6);
  });

  it("keeps the box on-canvas with padding (margins on both sides)", () => {
    const cam = fitBounds(0, 7, 0, 7, 300, 300, 2);
    const left = worldToScreen(cam, 0, 0).sx;
    const right = worldToScreen(cam, 8, 0).sx; // right edge of cell 7
    expect(left).toBeGreaterThan(0);
    expect(right).toBeLessThan(300);
    // Symmetric margins (centered).
    expect(left).toBeCloseTo(300 - right);
  });
});
