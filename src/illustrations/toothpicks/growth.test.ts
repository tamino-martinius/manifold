import { describe, expect, it } from "vitest";
import { computeToothpicks, packToothpicks } from "./growth";
import { BEND, STRAIGHT } from "./presets";
import type { Shape } from "./types";

const straight: Shape = {
  id: "s",
  name: "Straight",
  color: "#0e7490",
  weight: 1,
  outDocks: STRAIGHT.outDocks,
  visual: STRAIGHT.visual,
};
const bend: Shape = {
  id: "b",
  name: "Bend",
  color: "#b45309",
  weight: 1,
  outDocks: BEND.outDocks,
  visual: BEND.visual,
};

// OEIS A139250: number of toothpicks after n stages.
const A139250 = [0, 1, 3, 7, 11, 15, 23, 35, 43, 47, 55, 67, 79, 95, 123, 155, 171];

describe("computeToothpicks — Straight reproduces A139250", () => {
  for (let n = 0; n < A139250.length; n++) {
    it(`A139250(${n}) = ${A139250[n]} after ${n} generations`, () => {
      const instances = computeToothpicks([straight], "round-robin", n);
      expect(instances.length).toBe(A139250[n]);
    });
  }
});

describe("computeToothpicks — per-generation shape + capping", () => {
  it("colors each whole generation by the round-robin shape", () => {
    const instances = computeToothpicks([straight, bend], "round-robin", 3);
    // gen 0 -> straight, gen 1 -> bend, gen 2 -> straight
    expect(instances[0].generation).toBe(0);
    expect(instances[0].color).toBe(straight.color);
    const gen1 = instances.find((i) => i.generation === 1);
    const gen2 = instances.find((i) => i.generation === 2);
    expect(gen1?.color).toBe(bend.color);
    expect(gen2?.color).toBe(straight.color);
  });

  it("caps when two open docks meet (stage 3 leaves 4 exposed corners)", () => {
    // Straight: a(3)=7, a(4)=11 -> stage 4 adds exactly 4 toothpicks because the
    // inner endpoints cancelled in pairs at stage 3.
    const g3 = computeToothpicks([straight], "round-robin", 3).length;
    const g4 = computeToothpicks([straight], "round-robin", 4).length;
    expect(g4 - g3).toBe(4);
  });
});

describe("packToothpicks", () => {
  it("packs segments columnar with ascending instanceIndex + genEnds", () => {
    const instances = computeToothpicks([straight], "round-robin", 3);
    const placed = packToothpicks(instances);
    expect(placed.count).toBe(7); // A139250(3)
    expect(placed.segCount).toBe(7); // Straight draws 1 segment per instance
    expect(placed.colors).toEqual(["#0e7490"]);
    expect(placed.genEnds).toEqual([1, 3, 7]); // cumulative through gens 0,1,2
    for (let i = 1; i < placed.segCount; i++) {
      expect(placed.instanceIndex[i]).toBeGreaterThanOrEqual(placed.instanceIndex[i - 1]);
    }
  });

  it("returns empty data for zero generations", () => {
    const placed = packToothpicks(computeToothpicks([straight], "round-robin", 0));
    expect(placed.count).toBe(0);
    expect(placed.segCount).toBe(0);
    expect(placed.genEnds).toEqual([]);
  });
});
