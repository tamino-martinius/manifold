import { describe, expect, it } from "vitest";
import { generateRecaman } from "./recaman";

const EXPECTED = [0, 1, 3, 6, 2, 7, 13, 20, 12, 21, 11, 22, 10, 23, 9, 24, 8, 25]; // A005132 first 18 terms

describe("recaman", () => {
  it("produces the A005132 values (subtract-if-positive-and-unseen)", () => {
    const { values } = generateRecaman(EXPECTED.length - 1); // 17 steps → 18 values
    expect(Array.from(values)).toEqual(EXPECTED);
  });

  it("backtracks early at a(4)=2 then steps forward", () => {
    const { values } = generateRecaman(5);
    expect(values[3]).toBe(6); // a(3)
    expect(values[4]).toBe(2); // 6-4=2 >0 and unseen → backtrack
    expect(values[5]).toBe(7); // 2-5<0 → forward
  });

  it("arc geometry: radius = n/2, center = midpoint, side alternates by parity", () => {
    const { starts, ends, above } = generateRecaman(6);
    // step 1: 0 → 1  → r=0.5, center 0.5, odd → above
    expect((ends[0] - starts[0]) / 2).toBeCloseTo(0.5);
    expect((starts[0] + ends[0]) / 2).toBeCloseTo(0.5);
    expect(above[0]).toBe(1);
    // step 2: 1 → 3  → r=1, center 2, even → below
    expect(Math.abs(ends[1] - starts[1]) / 2).toBeCloseTo(1);
    expect((starts[1] + ends[1]) / 2).toBeCloseTo(2);
    expect(above[1]).toBe(0);
    // gap always equals n
    for (let i = 0; i < starts.length; i++) {
      expect(Math.abs(ends[i] - starts[i])).toBe(i + 1);
    }
  });

  it("reports min/max value and max radius for the camera fit", () => {
    const arcs = generateRecaman(17);
    expect(arcs.minValue).toBe(0);
    expect(arcs.maxValue).toBe(25); // max over the first 18 A005132 terms
    expect(arcs.maxRadius).toBeCloseTo(17 / 2);
  });
});
