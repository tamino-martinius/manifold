import { describe, expect, it } from "vitest";
import { computeToothpicks, packToothpicks, segmentPoints } from "./growth";
import { BEND, STRAIGHT } from "./presets";
import type { Pt, Shape } from "./types";

const pt = (p: number, q: number, r: number, s: number): Pt => ({ p, q, r, s });

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

describe("computeToothpicks — Straight reproduces A139250 (capping unchanged for axis)", () => {
  for (let n = 0; n < A139250.length; n++) {
    it(`A139250(${n}) = ${A139250[n]} after ${n} generations`, () => {
      expect(computeToothpicks([straight], "round-robin", n).length).toBe(A139250[n]);
    });
  }
});

describe("computeToothpicks — line-touch capping", () => {
  it("colors each whole generation by the round-robin shape", () => {
    const instances = computeToothpicks([straight, bend], "round-robin", 3);
    expect(instances[0].color).toBe(straight.color);
    expect(instances.find((i) => i.generation === 1)?.color).toBe(bend.color);
  });

  it("caps an open end that lands on a toothpick body (not just a coincident point)", () => {
    // "Spike": one length-2 arm O→(0,0,2,0) (interior at (0,0,1,0)) and an out-dock
    // sitting on that interior. Under the old point-only rule it would keep growing;
    // under line-touch capping it caps immediately, so growth halts at 1 instance.
    const spike: Shape = {
      id: "spike",
      name: "Spike",
      color: "#000",
      weight: 1,
      outDocks: [{ at: pt(0, 0, 1, 0), dir: 2 }],
      visual: [{ a: pt(0, 0, 0, 0), b: pt(0, 0, 2, 0) }],
    };
    expect(computeToothpicks([spike], "round-robin", 5).length).toBe(1);
  });
});

describe("segmentPoints", () => {
  it("length-1 arm: two endpoints, no interior", () => {
    expect(segmentPoints(pt(0, 0, 0, 0), pt(1, 0, 0, 0))).toEqual([pt(0, 0, 0, 0), pt(1, 0, 0, 0)]);
  });
  it("length-2 arm: includes the midpoint", () => {
    expect(segmentPoints(pt(0, 0, -1, 0), pt(0, 0, 1, 0))).toEqual([
      pt(0, 0, -1, 0),
      pt(0, 0, 0, 0),
      pt(0, 0, 1, 0),
    ]);
  });
  it("diagonal length-2 arm: steps along the NE unit", () => {
    expect(segmentPoints(pt(0, -1, 0, 0), pt(0, 1, 0, 0))).toEqual([
      pt(0, -1, 0, 0),
      pt(0, 0, 0, 0),
      pt(0, 1, 0, 0),
    ]);
  });
});

describe("packToothpicks genSegEnds", () => {
  it("is cumulative segment counts per generation, monotonic, last === segCount", () => {
    const placed = packToothpicks(computeToothpicks([straight], "round-robin", 3));
    expect(placed.genSegEnds).toEqual([1, 3, 7]); // Straight draws 1 segment per instance
    expect(placed.genSegEnds[placed.genSegEnds.length - 1]).toBe(placed.segCount);
  });
});
