import { describe, expect, it } from "vitest";
import { approach } from "./count-to";

describe("approach", () => {
  it("is a fixed point at the target", () => {
    expect(approach(42, 42, 0.1)).toBe(42);
  });

  it("moves toward the target without overshooting", () => {
    const next = approach(0, 100, 0.1);
    expect(next).toBeGreaterThan(0);
    expect(next).toBeLessThan(100);
  });

  it("snaps exactly onto the target when within 0.5", () => {
    expect(approach(99.7, 100, 0)).toBe(100);
    expect(approach(0.4, 0, 0)).toBe(0);
  });

  it("clamps dt so a long stall cannot jump straight to the target", () => {
    expect(approach(0, 100, 999)).toBe(approach(0, 100, 0.1));
    expect(approach(0, 100, 999)).toBeLessThan(100);
  });

  it("converges onto the target when iterated", () => {
    let v = 0;
    for (let i = 0; i < 300; i++) v = approach(v, 1000, 0.1);
    expect(v).toBe(1000);
  });

  it("counts down as well as up", () => {
    const next = approach(100, 0, 0.1);
    expect(next).toBeLessThan(100);
    expect(next).toBeGreaterThan(0);
  });
});
