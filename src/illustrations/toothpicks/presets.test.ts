import { describe, expect, it } from "vitest";
import { SHAPE_PRESETS, STRAIGHT, defaultShapes, presetNameFor } from "./presets";

describe("presets", () => {
  it("Straight emits two perpendicular out-docks (N and S)", () => {
    expect(STRAIGHT.outDocks).toHaveLength(2);
    expect(STRAIGHT.outDocks.map((d) => d.dir).sort((a, b) => a - b)).toEqual([2, 6]);
  });
  it("has four uniquely-named presets", () => {
    const names = SHAPE_PRESETS.map((p) => p.name);
    expect(names).toEqual(["Straight", "T", "Bend", "Cross"]);
    expect(new Set(names).size).toBe(4);
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
});
