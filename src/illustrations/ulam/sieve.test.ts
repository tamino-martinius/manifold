import { describe, expect, it } from "vitest";
import { highlightFlags, isTwin, quadValues, sieve, squareValues, triangularValues } from "./sieve";

const primesUpTo = (s: Uint8Array): number[] => {
  const out: number[] = [];
  for (let v = 0; v < s.length; v++) if (s[v]) out.push(v);
  return out;
};

const euler = (k: number): number => k * k + k + 41;

describe("sieve", () => {
  it("flags exactly the primes <= 50", () => {
    const s = sieve(50);
    expect(primesUpTo(s)).toEqual([2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47]);
    expect(s[0]).toBe(0);
    expect(s[1]).toBe(0);
    expect(s[49]).toBe(0); // 7^2 is not prime
    expect(s.length).toBe(51); // n + 1
  });

  it("handles tiny n without out-of-bounds", () => {
    expect(primesUpTo(sieve(1))).toEqual([]);
    expect(primesUpTo(sieve(2))).toEqual([2]);
    expect(primesUpTo(sieve(0))).toEqual([]);
  });

  it("marks the Euler run E(k)=k^2+k+41 prime for k=0..39 and not at k=40", () => {
    const s = sieve(euler(40)); // 1681
    for (let k = 0; k <= 39; k++) {
      expect(s[euler(k)]).toBe(1); // 41,43,47,...,1601 all prime
    }
    expect(euler(40)).toBe(1681);
    expect(s[1681]).toBe(0); // 41^2 — the run ends exactly here
  });
});

describe("quadValues", () => {
  it("ascends, stays <= n, and ends at 1601 for Euler over [1,1601]", () => {
    const vs = quadValues({ a: 1, b: 1, c: 41 }, 1601);
    expect(vs[0]).toBe(41);
    expect(vs[vs.length - 1]).toBe(1601);
    for (let i = 1; i < vs.length; i++) expect(vs[i]).toBeGreaterThanOrEqual(vs[i - 1]);
    for (const v of vs) expect(v).toBeLessThanOrEqual(1601);
    // E(0..39) is exactly 40 values.
    expect(vs).toEqual(Array.from({ length: 40 }, (_, k) => euler(k)));
  });

  it("terminates for a non-increasing custom quadratic", () => {
    // a = 0 would be a constant; ensure no infinite loop and only [1,n] values.
    const vs = quadValues({ a: 0, b: 0, c: 41 }, 100);
    expect(vs.every((v) => v === 41)).toBe(true);
    expect(vs.length).toBeGreaterThan(0);
  });
});

describe("isTwin", () => {
  it("is true for twin primes and false otherwise", () => {
    const s = sieve(50);
    for (const p of [3, 5, 7, 11, 13, 17, 19]) expect(isTwin(s, p, 50)).toBe(true);
    expect(isTwin(s, 23, 50)).toBe(false); // 21 and 25 both non-prime
    expect(isTwin(s, 2, 50)).toBe(false); // 0 and 4 both non-prime
  });

  it("bounds-guards p+2 > n", () => {
    const s = sieve(13);
    expect(() => isTwin(s, 13, 13)).not.toThrow(); // only checks 11 (15 is out of range)
    expect(isTwin(s, 13, 13)).toBe(true); // 11 is prime
  });
});

describe("highlightFlags", () => {
  const eq = (a: Uint8Array, b: Uint8Array): boolean =>
    a.length === b.length && a.every((v, i) => v === b[i]);

  it("'primes' flags every prime", () => {
    const s = sieve(60);
    const f = highlightFlags(s, 60, "primes", { a: 1, b: 1, c: 41 });
    for (let v = 0; v <= 60; v++) expect(f[v]).toBe(s[v]);
  });

  it("'twin' flags iff isTwin", () => {
    const s = sieve(60);
    const f = highlightFlags(s, 60, "twin", { a: 1, b: 1, c: 41 });
    for (let v = 2; v <= 60; v++) expect(f[v] === 1).toBe(isTwin(s, v, 60));
  });

  it("'euler' flags iff a prime of form k^2+k+41 <= n", () => {
    const n = 1601;
    const s = sieve(n);
    const f = highlightFlags(s, n, "euler", { a: 1, b: 1, c: 41 });
    const eulerSet = new Set(quadValues({ a: 1, b: 1, c: 41 }, n).filter((v) => s[v]));
    for (let v = 0; v <= n; v++) expect(f[v] === 1).toBe(eulerSet.has(v));
    expect(f[41]).toBe(1);
    expect(f[1601]).toBe(1);
    expect(f[2]).toBe(0); // prime, but not of Euler form
  });

  it("'custom' with (1,1,41) reproduces 'euler'", () => {
    const n = 2000;
    const s = sieve(n);
    const e = highlightFlags(s, n, "euler", { a: 1, b: 1, c: 41 });
    const c = highlightFlags(s, n, "custom", { a: 1, b: 1, c: 41 });
    expect(eq(e, c)).toBe(true);
  });

  it("'squares' flags every perfect square, prime or not", () => {
    const n = 100;
    const s = sieve(n);
    const f = highlightFlags(s, n, "squares", { a: 1, b: 1, c: 41 });
    for (let v = 0; v <= n; v++) {
      const isSquare = Number.isInteger(Math.sqrt(v)) && v >= 1;
      expect(f[v] === 1).toBe(isSquare);
    }
    expect(f[1]).toBe(1); // 1 = 1^2, not prime, still flagged
    expect(f[49]).toBe(1); // 7^2, not prime, still flagged
  });

  it("'triangular' flags every triangular number, prime or not", () => {
    const n = 100;
    const s = sieve(n);
    const f = highlightFlags(s, n, "triangular", { a: 1, b: 1, c: 41 });
    const set = new Set(triangularValues(n));
    for (let v = 0; v <= n; v++) expect(f[v] === 1).toBe(set.has(v));
    expect(f[6]).toBe(1); // 6 = T(3), not prime, still flagged
  });
});

describe("squareValues", () => {
  it("lists perfect squares in [1, n] ascending", () => {
    expect(squareValues(50)).toEqual([1, 4, 9, 16, 25, 36, 49]);
    expect(squareValues(0)).toEqual([]);
  });
});

describe("triangularValues", () => {
  it("lists triangular numbers in [1, n] ascending", () => {
    expect(triangularValues(28)).toEqual([1, 3, 6, 10, 15, 21, 28]);
    expect(triangularValues(0)).toEqual([]);
  });
});
