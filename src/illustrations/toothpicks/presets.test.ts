import { describe, expect, it } from "vitest";
import { SHAPE_PRESETS, STRAIGHT, defaultShapes, presetNameFor } from "./presets";

describe("presets", () => {
  it("Straight emits two perpendicular out-docks (N and S)", () => {
    expect(STRAIGHT.outDocks).toHaveLength(2);
    expect(STRAIGHT.outDocks.map((d) => d.dir).sort((a, b) => a - b)).toEqual([2, 6]);
  });
  it("has six uniquely-named presets", () => {
    const names = SHAPE_PRESETS.map((p) => p.name);
    expect(names).toEqual(["Straight", "T", "Bend", "Bend L", "Long-L", "Cross"]);
    expect(new Set(names).size).toBe(6);
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
});
