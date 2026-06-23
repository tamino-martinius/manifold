import { describe, expect, it } from "vitest";
import { gridRadius, offsetKey } from "./pieces";
import { MOVEMENT_PRESETS, presetNameFor } from "./presets";

describe("movement presets", () => {
  it("are non-empty, 8-fold symmetric, and fit their grid", () => {
    for (const preset of MOVEMENT_PRESETS) {
      expect(preset.offsets.length).toBeGreaterThan(0);
      const set = new Set(preset.offsets.map(([x, y]) => offsetKey(x, y)));
      const r = gridRadius(preset.gridSize);
      for (const [x, y] of preset.offsets) {
        expect(Math.abs(x)).toBeLessThanOrEqual(r);
        expect(Math.abs(y)).toBeLessThanOrEqual(r);
        const variants: [number, number][] = [
          [-x, y],
          [x, -y],
          [-x, -y],
          [y, x],
          [-y, x],
          [y, -x],
          [-y, -x],
        ];
        for (const [a, b] of variants) {
          expect(set.has(offsetKey(a, b))).toBe(true);
        }
      }
    }
  });

  it("presetNameFor identifies a known preset and Custom otherwise", () => {
    const knight = MOVEMENT_PRESETS.find((p) => p.name === "Knight");
    if (!knight) throw new Error("Knight preset missing");
    expect(presetNameFor(knight.gridSize, knight.offsets)).toBe("Knight");
    expect(presetNameFor(5, [[1, 0]])).toBe("Custom");
  });
});
