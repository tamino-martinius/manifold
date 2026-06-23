import { describe, expect, it } from "vitest";
import { countPairs, goldbachCounts, sieve } from "./goldbach";

describe("sieve", () => {
  it("flags exactly the primes <= 50", () => {
    const s = sieve(50);
    const primes = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47];
    for (let i = 0; i <= 50; i++) {
      expect(Boolean(s[i])).toBe(primes.includes(i));
    }
    expect(s[0]).toBe(0);
    expect(s[1]).toBe(0);
    expect(s[49]).toBe(0); // 7^2
  });
});

describe("goldbachCounts", () => {
  it("matches the A045917 reference table for E = 4..24", () => {
    const { E, g, maxG } = goldbachCounts(24);
    const expectedE = [4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24];
    const expectedG = [1, 1, 1, 2, 1, 2, 2, 2, 2, 3, 3];
    expect(E.length).toBe(11);
    expect(g.length).toBe(11);
    expect([...E]).toEqual(expectedE);
    expect([...g]).toEqual(expectedG);
    expect(maxG).toBe(3);
  });

  it("emits only even values 4..N ascending", () => {
    const { E } = goldbachCounts(40);
    expect(E[0]).toBe(4);
    expect(E[E.length - 1]).toBe(40);
    for (let i = 0; i < E.length; i++) {
      expect(E[i]).toBe(4 + 2 * i);
      expect(E[i] % 2).toBe(0);
    }
  });

  it("decomposition spot-checks", () => {
    const { E, g } = goldbachCounts(24);
    const at = (e: number): number => g[E.indexOf(e)];
    expect(at(10)).toBe(2); // 3+7, 5+5
    expect(at(22)).toBe(3); // 3+19, 5+17, 11+11
    expect(at(24)).toBe(3); // 5+19, 7+17, 11+13
  });

  it("maxG equals the max of g for a small N", () => {
    const { g, maxG } = goldbachCounts(120);
    expect(maxG).toBe(Math.max(...g));
  });

  it("no-zero floor: every g[i] >= 1 up to N = 1000 (Goldbach holds)", () => {
    const { g } = goldbachCounts(1000);
    for (let i = 0; i < g.length; i++) expect(g[i]).toBeGreaterThanOrEqual(1);
  });

  it("returns empty data below E = 4", () => {
    const { E, g, maxG } = goldbachCounts(2);
    expect(E.length).toBe(0);
    expect(g.length).toBe(0);
    expect(maxG).toBe(0);
  });

  it("reports progress and finishes at the total", () => {
    const seen: number[] = [];
    const total: number[] = [];
    goldbachCounts(2000, (done, t) => {
      seen.push(done);
      total.push(t);
    });
    expect(seen.length).toBeGreaterThan(0);
    const last = total[total.length - 1];
    expect(seen[seen.length - 1]).toBe(last);
    expect(seen.every((n) => n >= 0 && n <= last)).toBe(true);
  });
});

describe("countPairs cross-check", () => {
  it("spot-checks agree with the table", () => {
    expect(countPairs(24, 4)).toBe(1);
    expect(countPairs(24, 10)).toBe(2);
    expect(countPairs(24, 22)).toBe(3);
    expect(countPairs(24, 24)).toBe(3);
  });

  it("the per-E and global methods agree for all even E in [4, 200]", () => {
    const { E, g } = goldbachCounts(200);
    for (let i = 0; i < E.length; i++) {
      expect(countPairs(200, E[i])).toBe(g[i]);
    }
  });
});
