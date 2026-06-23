import { describe, expect, it } from "vitest";
import { type FordCircle, fareySequence, fordCircles, gcd, mediant, tangent } from "./farey";

const frac = (s: FordCircle[]) => s.map((c) => `${c.p}/${c.q}`);

describe("farey", () => {
  it("gcd via Euclid", () => {
    expect(gcd(12, 8)).toBe(4);
    expect(gcd(7, 1)).toBe(1);
    expect(gcd(0, 5)).toBe(5);
  });

  it("F_5 is exactly the 11 reduced fractions in order", () => {
    expect(frac(fareySequence(5))).toEqual([
      "0/1",
      "1/5",
      "1/4",
      "1/3",
      "2/5",
      "1/2",
      "3/5",
      "2/3",
      "3/4",
      "4/5",
      "1/1",
    ]);
  });

  it("|F_n| follows A005728 for n = 1..6", () => {
    expect([1, 2, 3, 4, 5, 6].map((n) => fareySequence(n).length)).toEqual([2, 3, 5, 7, 11, 13]);
  });

  it("adjacent Farey fractions are tangent (|a·d − b·c| = 1); non-adjacent are not", () => {
    const s = fareySequence(6);
    for (let i = 0; i + 1 < s.length; i++) {
      expect(Math.abs(s[i].p * s[i + 1].q - s[i].q * s[i + 1].p)).toBe(1);
      expect(tangent(s[i], s[i + 1])).toBe(true);
    }
    // Tangency is |a·d − b·c| = 1 (Farey neighbors at *some* order), not mere
    // adjacency in F_6: e.g. 1/6 and 1/4 (with 1/5 between them) do not kiss.
    const sixth = s.find((c) => c.p === 1 && c.q === 6) as FordCircle;
    const fourth = s.find((c) => c.p === 1 && c.q === 4) as FordCircle;
    expect(Math.abs(sixth.p * fourth.q - sixth.q * fourth.p)).toBe(2);
    expect(tangent(sixth, fourth)).toBe(false);
  });

  it("mediant of 1/3 and 1/2 is 2/5", () => {
    const oneThird = { p: 1, q: 3, x: 1 / 3, r: 1 / 18, depth: 0 };
    const oneHalf = { p: 1, q: 2, x: 1 / 2, r: 1 / 8, depth: 0 };
    expect(mediant(oneThird, oneHalf)).toEqual({ p: 2, q: 5 });
  });

  it("Ford circle geometry: center.y == radius == 1/(2q²); fractions reduced", () => {
    for (const c of fordCircles(6, 0, 1)) {
      expect(c.r).toBeCloseTo(1 / (2 * c.q * c.q));
      expect(c.x).toBeCloseTo(c.p / c.q);
      expect(gcd(c.p, c.q)).toBe(1);
    }
  });

  it("Stern–Brocot depth: 0/1 & 1/1 are 0, then 1/2, then 1/3 & 2/3, then the four order-4 mediants", () => {
    const depthOf = (p: number, q: number): number => {
      const c = fareySequence(q).find((x) => x.p === p && x.q === q);
      if (!c) throw new Error(`missing ${p}/${q}`);
      return c.depth;
    };
    expect(depthOf(0, 1)).toBe(0);
    expect(depthOf(1, 1)).toBe(0);
    expect(depthOf(1, 2)).toBe(1);
    expect(depthOf(1, 3)).toBe(2);
    expect(depthOf(2, 3)).toBe(2);
    for (const [p, q] of [
      [1, 4],
      [2, 5],
      [3, 5],
      [3, 4],
    ] as const) {
      expect(depthOf(p, q)).toBe(3);
    }
  });

  it("fordCircles enumerates denominators in non-decreasing q order (cheap reveal prefix)", () => {
    const cs = fordCircles(20, 0, 1);
    for (let i = 1; i < cs.length; i++) expect(cs[i].q).toBeGreaterThanOrEqual(cs[i - 1].q);
  });

  it("fordCircles windows to an arbitrary interval (every circle's disc overlaps [a,b])", () => {
    const a = 3;
    const b = 4;
    const cs = fordCircles(12, a, b);
    expect(cs.length).toBeGreaterThan(0);
    // Includes the integer circles 3/1 and 4/1 (radius 1/2, tangent at the ends).
    expect(cs.some((c) => c.p === 3 && c.q === 1)).toBe(true);
    expect(cs.some((c) => c.p === 4 && c.q === 1)).toBe(true);
    // 7/2 = 3.5 lives inside the window; numerators may exceed q when a > 0.
    expect(cs.some((c) => c.p === 7 && c.q === 2)).toBe(true);
    for (const c of cs) {
      expect(gcd(Math.abs(c.p), c.q)).toBe(1);
      expect(c.x + c.r).toBeGreaterThanOrEqual(a);
      expect(c.x - c.r).toBeLessThanOrEqual(b);
    }
  });
});
