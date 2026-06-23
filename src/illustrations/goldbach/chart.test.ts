import { describe, expect, it } from "vitest";
import { type ChartDims, chartToScreen, niceStep, xTicks, yTicks } from "./chart";

const DIMS: ChartDims = {
  W: 1000,
  H: 600,
  padLeft: 50,
  padRight: 20,
  padTop: 20,
  padBottom: 40,
  N: 20000,
  maxG: 100,
};

describe("chartToScreen", () => {
  it("maps the data-space corners to the padded plot rect (y flipped)", () => {
    const origin = chartToScreen(DIMS, 0, 0);
    expect(origin.sx).toBeCloseTo(50); // padLeft
    expect(origin.sy).toBeCloseTo(560); // H - padBottom (g=0 at bottom)

    const topRight = chartToScreen(DIMS, DIMS.N, DIMS.maxG);
    expect(topRight.sx).toBeCloseTo(980); // W - padRight
    expect(topRight.sy).toBeCloseTo(20); // padTop (max g at top)
  });

  it("is linear at the midpoint", () => {
    const mid = chartToScreen(DIMS, DIMS.N / 2, DIMS.maxG / 2);
    expect(mid.sx).toBeCloseTo((50 + 980) / 2);
    expect(mid.sy).toBeCloseTo((560 + 20) / 2);
  });
});

describe("niceStep", () => {
  it("picks round 1/2/5 × 10^k steps", () => {
    expect(niceStep(20000, 5)).toBe(5000);
    expect(niceStep(200000, 5)).toBe(50000);
    expect(niceStep(100, 5)).toBe(20);
    expect(niceStep(3, 5)).toBeCloseTo(0.5);
  });
});

describe("ticks", () => {
  it("x-ticks are round, ascending, start at 0 and stay within [0, N]", () => {
    const ticks = xTicks(DIMS);
    expect(ticks[0].value).toBe(0);
    expect(ticks.map((t) => t.value)).toEqual([0, 5000, 10000, 15000, 20000]);
    for (const t of ticks) {
      expect(t.sx).toBeGreaterThanOrEqual(DIMS.padLeft - 1e-6);
      expect(t.sx).toBeLessThanOrEqual(DIMS.W - DIMS.padRight + 1e-6);
    }
  });

  it("y-ticks are integers starting at 0 within [0, maxG]", () => {
    const ticks = yTicks({ ...DIMS, maxG: 7 });
    expect(ticks[0].value).toBe(0);
    for (const t of ticks) {
      expect(Number.isInteger(t.value)).toBe(true);
      expect(t.value).toBeLessThanOrEqual(7);
    }
  });
});
