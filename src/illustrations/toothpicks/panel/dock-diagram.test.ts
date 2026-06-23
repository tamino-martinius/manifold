import { describe, expect, it } from "vitest";
import { STRAIGHT, TEE } from "../presets";
import { diagramBounds } from "./dock-diagram";

describe("diagramBounds", () => {
  it("includes the in-dock arrow stub to the west of the origin", () => {
    const b = diagramBounds(STRAIGHT.outDocks, STRAIGHT.visual);
    expect(b.minX).toBeLessThanOrEqual(-1.3);
    expect(b.minY).toBeLessThanOrEqual(-1);
    expect(b.maxY).toBeGreaterThanOrEqual(1);
  });
  it("expands to cover a forward out-dock (T)", () => {
    const b = diagramBounds(TEE.outDocks, TEE.visual);
    expect(b.maxX).toBeGreaterThanOrEqual(1);
  });
});
