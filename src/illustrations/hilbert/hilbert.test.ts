import { describe, expect, it } from "vitest";
import { d2xy, hilbertPath, xy2d } from "./hilbert";

describe("hilbert", () => {
  it("order-1 walks the U shape (pins the orientation)", () => {
    // d = 0..3 → (0,0), (0,1), (1,1), (1,0)
    expect([0, 1, 2, 3].map((d) => d2xy(1, d))).toEqual([
      { x: 0, y: 0 },
      { x: 0, y: 1 },
      { x: 1, y: 1 },
      { x: 1, y: 0 },
    ]);
  });

  it("d2xy and xy2d are exact inverses for all d (k = 1..5)", () => {
    for (let k = 1; k <= 5; k++) {
      const n = 4 ** k;
      for (let d = 0; d < n; d++) {
        const { x, y } = d2xy(k, d);
        expect(xy2d(k, x, y)).toBe(d);
      }
    }
  });

  it("produces 4^k distinct points covering every grid cell (k = 1..5)", () => {
    for (let k = 1; k <= 5; k++) {
      const n = 4 ** k;
      const side = 1 << k;
      const seen = new Set<number>();
      for (let d = 0; d < n; d++) {
        const { x, y } = d2xy(k, d);
        expect(x).toBeGreaterThanOrEqual(0);
        expect(y).toBeGreaterThanOrEqual(0);
        expect(x).toBeLessThan(side);
        expect(y).toBeLessThan(side);
        seen.add(y * side + x);
      }
      expect(seen.size).toBe(n); // all distinct ⇒ covers every cell
    }
  });

  it("consecutive points are always 4-adjacent (continuity + non-crossing)", () => {
    for (let k = 1; k <= 6; k++) {
      const n = 4 ** k;
      let prev = d2xy(k, 0);
      for (let d = 1; d < n; d++) {
        const cur = d2xy(k, d);
        const manhattan = Math.abs(cur.x - prev.x) + Math.abs(cur.y - prev.y);
        expect(manhattan).toBe(1);
        prev = cur;
      }
    }
  });

  it("hilbertPath has the right shape and matches d2xy", () => {
    for (let k = 1; k <= 5; k++) {
      const n = 4 ** k;
      const path = hilbertPath(k);
      expect(path.n).toBe(n);
      expect(path.xs.length).toBe(n);
      expect(path.ys.length).toBe(n);
      for (let d = 0; d < n; d++) {
        const { x, y } = d2xy(k, d);
        expect(path.xs[d]).toBe(x);
        expect(path.ys[d]).toBe(y);
      }
    }
  });

  it("memoizes: same k returns the identical cached arrays", () => {
    const a = hilbertPath(7);
    const b = hilbertPath(7);
    expect(a.xs).toBe(b.xs);
    expect(a.ys).toBe(b.ys);
  });
});
