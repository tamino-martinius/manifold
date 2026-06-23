import { describe, expect, it } from "vitest";
import { generateDragon, turnRight } from "./dragon";

// A014577 first turns, 1 = Right, 0 = Left.
const EXPECTED_TURNS = [1, 1, 0, 1, 1, 0, 0, 1, 1, 1, 0, 0, 1, 0, 0];

describe("turnRight (A014577 paper-folding sequence)", () => {
  it("matches the canonical first turns R,R,L,R,R,L,L,R,R,R,L,L,R,L,L", () => {
    const got = EXPECTED_TURNS.map((_, k) => (turnRight(k + 1) ? 1 : 0));
    expect(got).toEqual(EXPECTED_TURNS);
  });
});

describe("generateDragon", () => {
  it("order k yields 2^k segments and 2^k + 1 points (closed-bounded)", () => {
    for (const k of [1, 2, 5, 10]) {
      const g = generateDragon(k);
      expect(g.count).toBe(2 ** k);
      expect(g.points.length).toBe(2 * (2 ** k + 1)); // 2*(N+1) floats
    }
  });

  it("walks the integer lattice at the full 90° fold and stays bounded", () => {
    const g = generateDragon(4); // default foldAngle = π/2
    expect(Number.isFinite(g.minX)).toBe(true);
    expect(Number.isFinite(g.maxX)).toBe(true);
    // integer lattice at θ = 90°
    expect(Number.isInteger(g.points[0])).toBe(true);
    expect(Number.isInteger(g.points[2])).toBe(true);
  });

  it("a straight strip (foldAngle 0) is collinear: all y ≈ 0", () => {
    const g = generateDragon(6, 0);
    for (let i = 1; i < g.points.length; i += 2) {
      expect(Math.abs(g.points[i])).toBeLessThan(1e-9);
    }
  });

  it("reports bounds that tightly enclose every generated point", () => {
    const g = generateDragon(8); // full dragon
    let minX = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;
    for (let i = 0; i < g.points.length; i += 2) {
      const x = g.points[i];
      const y = g.points[i + 1];
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
    expect(g.minX).toBeCloseTo(minX, 9);
    expect(g.maxX).toBeCloseTo(maxX, 9);
    expect(g.minY).toBeCloseTo(minY, 9);
    expect(g.maxY).toBeCloseTo(maxY, 9);
  });

  it("is prefix-stable: the first 2^k segments of order m equal order k", () => {
    // The paper-folding turns are order-independent, so a higher-order walk
    // extends a lower-order one vertex-for-vertex. The iteration animation
    // relies on this to reveal a growing prefix as a continuous lower order.
    const hi = generateDragon(12);
    const lo = generateDragon(6);
    for (let i = 0; i < lo.points.length; i++) {
      expect(hi.points[i]).toBe(lo.points[i]);
    }
  });

  it("starts at the origin heading +x", () => {
    const g = generateDragon(3);
    expect(g.points[0]).toBe(0);
    expect(g.points[1]).toBe(0);
    // first unit segment advances along +x to (1, 0)
    expect(g.points[2]).toBeCloseTo(1, 9);
    expect(g.points[3]).toBeCloseTo(0, 9);
  });
});
