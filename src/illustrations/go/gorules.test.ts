import { describe, expect, it } from "vitest";
import { cellKey, keyX, keyY } from "./gorules";

describe("cellKey", () => {
  it("round-trips coordinates including negatives", () => {
    for (const [x, y] of [
      [0, 0],
      [5, -3],
      [-7, 9],
      [-511, 511],
    ]) {
      const k = cellKey(x, y);
      expect(keyX(k)).toBe(x);
      expect(keyY(k)).toBe(y);
    }
  });

  it("is unique per coordinate", () => {
    const seen = new Set<number>();
    for (let x = -20; x <= 20; x++)
      for (let y = -20; y <= 20; y++) {
        const k = cellKey(x, y);
        expect(seen.has(k)).toBe(false);
        seen.add(k);
      }
  });
});
