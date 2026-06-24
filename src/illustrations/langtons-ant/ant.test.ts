import { describe, expect, it } from "vitest";
import { type AntSim, createSim, pack, parseRule, step, stepN } from "./ant";

// Verified A255938 prefix from the live OEIS b-file: "number of black cells on
// the infinite grid after the ant moves n times." a(0)=0 (empty grid), then the
// running count after each single step. The 5->3 dip (a(4)=4, a(5)=3) is the key
// signal — the ant re-enters a black cell and unpaints it.
const A255938 = [0, 1, 2, 3, 4, 3, 4, 5, 6, 7, 6, 7];

function classic(): AntSim {
  return createSim(parseRule("RL"));
}

describe("parseRule", () => {
  it("parses the classic ant", () => {
    expect(parseRule("RL")).toEqual(["R", "L"]);
  });

  it("gives one color per letter", () => {
    expect(parseRule("LLRR").length).toBe(4);
  });

  it("accepts the U-turn and no-turn letters", () => {
    expect(parseRule("LUNR")).toEqual(["L", "U", "N", "R"]);
  });

  it("rejects the empty string", () => {
    expect(() => parseRule("")).toThrow();
  });

  it("rejects unknown letters", () => {
    expect(() => parseRule("XZ")).toThrow();
  });

  it("is case-strict (lowercase rejected)", () => {
    expect(() => parseRule("rl")).toThrow();
  });
});

describe("classic ant step", () => {
  it("paints the origin, turns right and steps forward on the first move", () => {
    const sim = classic();
    step(sim);
    expect(sim.cells.get(pack(0, 0))).toBe(1); // origin flipped to black
    expect(sim.h).toBe(1); // started heading N(0); turned right -> E(1)
    expect(sim.x).toBe(1); // stepped forward one cell along the new heading
    expect(sim.y).toBe(0);
    expect(sim.blackCount).toBe(1);
  });

  it("on a black cell turns left, unpaints it, and decrements the count", () => {
    const sim = classic();
    // Place the ant on a black cell at the origin.
    sim.cells.set(pack(0, 0), 1);
    sim.blackCount = 1;
    step(sim);
    expect(sim.cells.has(pack(0, 0))).toBe(false); // unpainted -> removed from map
    expect(sim.blackCount).toBe(0);
    expect(sim.h).toBe(3); // started N(0); turned left -> W(3)
  });

  it("matches the verified A255938 black-cell prefix", () => {
    const sim = classic();
    const seq = [sim.blackCount]; // a(0) = 0
    for (let n = 1; n < A255938.length; n++) {
      step(sim);
      seq.push(sim.blackCount);
    }
    expect(seq).toEqual(A255938);
  });
});

describe("stepN determinism", () => {
  it("equals N single steps in position, heading, count and bbox", () => {
    const a = classic();
    const b = classic();
    for (let i = 0; i < 100; i++) step(a);
    stepN(b, 100);
    expect({ x: b.x, y: b.y, h: b.h, blackCount: b.blackCount }).toEqual({
      x: a.x,
      y: a.y,
      h: a.h,
      blackCount: a.blackCount,
    });
    expect([b.minX, b.maxX, b.minY, b.maxY]).toEqual([a.minX, a.maxX, a.minY, a.maxY]);
    expect(b.cells.size).toBe(a.cells.size);
  });
});

describe("painted bounding box", () => {
  it("starts at the origin and only grows", () => {
    const sim = classic();
    expect([sim.minX, sim.maxX, sim.minY, sim.maxY]).toEqual([0, 0, 0, 0]);
    stepN(sim, 500);
    expect(sim.minX).toBeLessThanOrEqual(0);
    expect(sim.maxX).toBeGreaterThanOrEqual(0);
    expect(sim.minY).toBeLessThanOrEqual(0);
    expect(sim.maxY).toBeGreaterThanOrEqual(0);
  });
});

describe("coordinate packing", () => {
  it("round-trips signed coordinates uniquely", () => {
    const seen = new Set<number>();
    for (const [x, y] of [
      [0, 0],
      [1, 0],
      [0, 1],
      [-1, 0],
      [0, -1],
      [12345, -6789],
      [-99999, 99999],
    ] as const) {
      const k = pack(x, y);
      expect(seen.has(k)).toBe(false);
      seen.add(k);
    }
  });
});

describe("highway detection", () => {
  it("latches on the classic ant once the periodic highway begins", () => {
    const sim = classic();
    expect(sim.highway).toBe(false);
    stepN(sim, 12000); // highway onset is ~step 10,000
    expect(sim.highway).toBe(true);
  });

  it("does not claim a highway for a non-classic turmite", () => {
    const sim = createSim(parseRule("RLR"));
    stepN(sim, 12000);
    expect(sim.highway).toBe(false);
  });
});
