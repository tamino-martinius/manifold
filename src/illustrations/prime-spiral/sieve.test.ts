import { describe, expect, it } from "vitest";
import { armOf, coordsFor, primeMask, sieve } from "./sieve";

describe("sieve", () => {
  it("returns exactly the primes up to 50", () => {
    expect(sieve(50)).toEqual([2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47]);
  });

  it("treats 0 and 1 as non-prime and 2 as prime", () => {
    const mask = primeMask(10);
    expect(mask[0]).toBe(0);
    expect(mask[1]).toBe(0);
    expect(mask[2]).toBe(1);
    expect(mask[9]).toBe(0);
  });

  it("handles tiny N without throwing", () => {
    expect(sieve(1)).toEqual([]);
    expect(sieve(0)).toEqual([]);
    expect(() => sieve(2)).not.toThrow();
    expect(sieve(2)).toEqual([2]);
  });
});

describe("armOf", () => {
  it("equals n mod m for mod 44", () => {
    for (const n of [1, 43, 44, 45, 88, 89]) {
      expect(armOf(n, 44)).toBe(n % 44);
    }
  });

  it("equals n mod m for mod 6", () => {
    for (let n = 0; n <= 20; n++) {
      expect(armOf(n, 6)).toBe(n % 6);
    }
  });

  it("normalises into [0, m) for negative n", () => {
    expect(armOf(-1, 44)).toBe(43);
  });
});

describe("coordsFor", () => {
  it("places n at radius n", () => {
    for (const n of [1, 7, 100, 9973]) {
      const { x, y } = coordsFor(n);
      expect(Math.hypot(x, y)).toBeCloseTo(n, 6);
    }
  });
});
