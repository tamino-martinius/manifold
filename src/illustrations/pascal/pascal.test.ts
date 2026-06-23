import { describe, expect, it } from "vitest";
import { buildResidues, gcd, isPerfect, isPrime, lucasMod } from "./pascal";

// Direct (big-int safe at small i) binomial for cross-checking Lucas.
function binom(i: number, j: number): number {
  if (j < 0 || j > i) return 0;
  let r = 1;
  for (let k = 0; k < j; k++) r = (r * (i - k)) / (k + 1);
  return Math.round(r);
}

// Read residue of cell (i,j) out of a packed PascalResidues.
function at(res: ReturnType<typeof buildResidues>, i: number, j: number): number {
  return res.values[res.rowStart[i] + j];
}

const row = (r: ReturnType<typeof buildResidues>, i: number) =>
  Array.from({ length: i + 1 }, (_, j) => at(r, i, j));

describe("pascal residues (modular row build)", () => {
  it("row 4 is [1,4,6,4,1]; mod 2 → [1,0,0,0,1]", () => {
    expect(row(buildResidues(5, 1_000_000), 4)).toEqual([1, 4, 6, 4, 1]); // m huge → raw values
    expect(row(buildResidues(5, 2), 4)).toEqual([1, 0, 0, 0, 1]);
  });

  it("A047999: Pascal mod 2, first five rows", () => {
    const r = buildResidues(5, 2);
    expect(row(r, 0)).toEqual([1]); // 1
    expect(row(r, 1)).toEqual([1, 1]); // 1 1
    expect(row(r, 2)).toEqual([1, 0, 1]); // 1 0 1
    expect(row(r, 3)).toEqual([1, 1, 1, 1]); // 1 1 1 1
    expect(row(r, 4)).toEqual([1, 0, 0, 0, 1]); // 1 0 0 0 1
  });

  it("packs rowStart as the triangular numbers and a correct total", () => {
    const r = buildResidues(6, 3);
    expect(Array.from(r.rowStart)).toEqual([0, 1, 3, 6, 10, 15, 21]);
    expect(r.values.length).toBe(21);
  });
});

describe("lucasMod agrees with direct binomial mod p", () => {
  it("matches C(i,j) mod p for all i ≤ 12, p ∈ {2,3,5}", () => {
    for (const p of [2, 3, 5]) {
      for (let i = 0; i <= 12; i++) {
        for (let j = 0; j <= i; j++) {
          expect(lucasMod(i, j, p)).toBe(binom(i, j) % p);
        }
      }
    }
  });

  it("throws on a composite modulus", () => {
    expect(() => lucasMod(4, 2, 4)).toThrow();
  });
});

describe("row build and Lucas agree where both apply (prime m)", () => {
  it("buildResidues == lucasMod for every cell, i ≤ 20, p ∈ {2,3,5,7}", () => {
    for (const p of [2, 3, 5, 7]) {
      const res = buildResidues(21, p);
      for (let i = 0; i <= 20; i++) {
        for (let j = 0; j <= i; j++) {
          expect(at(res, i, j)).toBe(lucasMod(i, j, p));
        }
      }
    }
  });

  it("agrees at the largest supported prime (p=47, i ≤ 60 → 2-digit base-47)", () => {
    const p = 47;
    const res = buildResidues(61, p);
    for (let i = 0; i <= 60; i++) {
      for (let j = 0; j <= i; j++) {
        expect(at(res, i, j)).toBe(lucasMod(i, j, p));
      }
    }
  });
});

describe("helpers", () => {
  it("isPrime classifies the small moduli", () => {
    expect([2, 3, 5, 7].every(isPrime)).toBe(true);
    expect([4, 6, 8, 9].some(isPrime)).toBe(false);
  });

  it("gcd computes the greatest common divisor", () => {
    expect(gcd(12, 8)).toBe(4);
    expect(gcd(17, 5)).toBe(1);
    expect(gcd(0, 9)).toBe(9);
  });

  it("isPerfect classifies perfect numbers", () => {
    expect([6, 28, 496, 8128].every(isPerfect)).toBe(true);
    expect([1, 2, 4, 5, 8, 12, 16, 27].some(isPerfect)).toBe(false);
  });
});
