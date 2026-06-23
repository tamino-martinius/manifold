import { describe, expect, it } from "vitest";
import { SHAPE_PRESETS, STRAIGHT, defaultShapes, presetNameFor } from "./presets";

describe("presets", () => {
  it("Straight emits two perpendicular out-docks (N and S)", () => {
    expect(STRAIGHT.outDocks).toHaveLength(2);
    expect(STRAIGHT.outDocks.map((d) => d.dir).sort()).toEqual([1, 3]);
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
  it("defaultShapes returns Straight + Bend with distinct colors", () => {
    const shapes = defaultShapes();
    expect(shapes.map((s) => s.name)).toEqual(["Straight", "Bend"]);
    expect(shapes[0].color).not.toBe(shapes[1].color);
    expect(new Set(shapes.map((s) => s.id)).size).toBe(2);
  });
});
