import { describe, expect, it } from "vitest";
import { SHAPE_PRESETS, STRAIGHT, defaultShapes, presetNameFor, visiblePresets } from "./presets";

describe("presets", () => {
  it("Straight emits two perpendicular out-docks (N and S)", () => {
    expect(STRAIGHT.outDocks).toHaveLength(2);
    expect(STRAIGHT.outDocks.map((d) => d.dir).sort((a, b) => a - b)).toEqual([2, 6]);
  });
  it("has sixteen uniquely-named presets (90° first, then the hidden 45° family)", () => {
    const names = SHAPE_PRESETS.map((p) => p.name);
    expect(names).toEqual([
      "Straight",
      "T",
      "Bend",
      "Bend L",
      "Long-L",
      "Cross",
      "Y",
      "U",
      "Stairs",
      "Diagonal",
      "45°-Bend",
      "V",
      "D",
      "E",
      "Fork",
      "Asterisk",
    ]);
    expect(new Set(names).size).toBe(16);
  });
  it("hides the 45° presets from the picker but keeps them in SHAPE_PRESETS", () => {
    const visible = visiblePresets().map((p) => p.name);
    expect(visible).toEqual(["Straight", "T", "Bend", "Bend L", "Long-L", "Cross", "Y", "U", "Stairs"]);
    for (const n of ["Diagonal", "45°-Bend", "V", "D", "E", "Fork", "Asterisk"]) {
      expect(visible).not.toContain(n); // hidden from the dropdown
      expect(SHAPE_PRESETS.map((p) => p.name)).toContain(n); // but still in code
    }
  });
  it("adds the 90° Y (trident), U (staple), and Stairs presets", () => {
    const y = SHAPE_PRESETS.find((p) => p.name === "Y");
    const u = SHAPE_PRESETS.find((p) => p.name === "U");
    const stairs = SHAPE_PRESETS.find((p) => p.name === "Stairs");
    // Y + U: two forward (East=0) out-docks at the prong tips; Stairs: one.
    expect(y?.outDocks.map((d) => d.dir)).toEqual([0, 0]);
    expect(u?.outDocks.map((d) => d.dir)).toEqual([0, 0]);
    expect(stairs?.outDocks).toHaveLength(1);
    expect(stairs?.outDocks[0].dir).toBe(0);
    // All three are axis-only (q = s = 0) → genuine 90° shapes.
    const axisOnly = (p?: { outDocks: { at: { q: number; s: number } }[] }) =>
      p?.outDocks.every((d) => d.at.q === 0 && d.at.s === 0);
    expect(axisOnly(y) && axisOnly(u) && axisOnly(stairs)).toBe(true);
  });
  it("presetNameFor matches a known preset and falls back to Custom", () => {
    expect(presetNameFor(STRAIGHT)).toBe("Straight");
    expect(presetNameFor({ outDocks: [], visual: [] })).toBe("Custom");
  });
  it("defaultShapes returns two distinct-colored straight rings", () => {
    const shapes = defaultShapes();
    // Both default shapes use the Straight geometry so the load view is the
    // iconic A139250 sieve; the round-robin order paints alternating colored
    // rings, demonstrating the per-generation mechanic. Distinct colours + ids.
    expect(shapes.map((s) => s.name)).toEqual(["Straight", "Straight"]);
    expect(shapes.every((s) => s.outDocks === STRAIGHT.outDocks)).toBe(true);
    expect(shapes[0].color).not.toBe(shapes[1].color);
    expect(new Set(shapes.map((s) => s.id)).size).toBe(2);
  });
  it("includes the opposite bend and the long-L (90° family)", () => {
    const names = SHAPE_PRESETS.map((p) => p.name);
    expect(names).toContain("Bend L");
    expect(names).toContain("Long-L");
    const bendL = SHAPE_PRESETS.find((p) => p.name === "Bend L");
    const bend = SHAPE_PRESETS.find((p) => p.name === "Bend");
    // Same single-dock structure as Bend, but turning the other way (dir differs).
    expect(bendL?.outDocks).toHaveLength(1);
    expect(bendL?.outDocks[0].dir).not.toBe(bend?.outDocks[0].dir);
  });
  it("includes the 45° family with diagonal docks", () => {
    const names = SHAPE_PRESETS.map((p) => p.name);
    for (const n of ["Diagonal", "45°-Bend", "V", "D", "E", "Fork", "Asterisk"]) {
      expect(names).toContain(n);
    }
    // Diagonal docks use the diagonal directions (NE=1, NW=3, SW=5, SE=7).
    const diagonal = SHAPE_PRESETS.find((p) => p.name === "Diagonal");
    expect(diagonal?.outDocks.map((d) => d.dir).sort((a, b) => a - b)).toEqual([1, 5]);
    const vee = SHAPE_PRESETS.find((p) => p.name === "V");
    expect(vee?.outDocks).toHaveLength(2);
    expect(vee?.outDocks.every((d) => d.dir % 2 === 1)).toBe(true); // both diagonal
  });
});
