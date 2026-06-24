import { describe, expect, it } from "vitest";
import { buildGeometry, stepsToOne, trajectory } from "./collatz";

const DEG = Math.PI / 180;

describe("trajectory", () => {
  it("walks 6 down to 1 through the known sequence", () => {
    expect(trajectory(6)).toEqual([6, 3, 10, 5, 16, 8, 4, 2, 1]);
  });

  it("is just [1] for n = 1", () => {
    expect(trajectory(1)).toEqual([1]);
  });
});

describe("stepsToOne (A006577)", () => {
  it("matches the OEIS values for n = 1..7", () => {
    const got = [1, 2, 3, 4, 5, 6, 7].map(stepsToOne);
    expect(got).toEqual([0, 1, 7, 2, 5, 8, 16]);
  });

  it("equals trajectory length minus one", () => {
    for (let n = 1; n <= 50; n++) {
      expect(stepsToOne(n)).toBe(trajectory(n).length - 1);
    }
  });
});

describe("buildGeometry", () => {
  it("produces a deterministic, hand-derivable tiny case (N=2, 90°, L=1)", () => {
    const g = buildGeometry({ n: 2, thetaEvenRad: 90 * DEG, thetaOddRad: 90 * DEG, segLen: 1 });
    // One edge: root (0,0) -> node 2. Value 2 is even, so heading rotates
    // +90° from START_HEADING (up), pointing left: child lands at (-1, 0).
    expect(g.edgeCount).toBe(1);
    expect(g.x0s[0]).toBeCloseTo(0, 9);
    expect(g.y0s[0]).toBeCloseTo(0, 9);
    expect(g.x1s[0]).toBeCloseTo(-1, 9);
    expect(g.y1s[0]).toBeCloseTo(0, 9);
    expect(g.depths[0]).toBe(1);
    expect(g.weights[0]).toBeCloseTo(1, 6);
    expect(g.maxDepth).toBe(1);
    // Bounding box pins the camera fit.
    expect(g.minX).toBeCloseTo(-1, 9);
    expect(g.maxX).toBeCloseTo(0, 9);
    expect(g.minY).toBeCloseTo(0, 9);
    expect(g.maxY).toBeCloseTo(0, 9);
  });

  it("depth of the deepest node equals its total stopping time (N=4)", () => {
    const g = buildGeometry({ n: 4, thetaEvenRad: 8 * DEG, thetaOddRad: 16 * DEG, segLen: 1.6 });
    // Seeds 1..4 union to nodes {1,2,3,4,5,8,10,16}; the deepest is value 3 at
    // depth stepsToOne(3) = 7.
    expect(g.edgeCount).toBe(7); // 8 unique nodes - 1
    expect(g.maxDepth).toBe(7);
  });

  it("dedupes shared geometry: every value 1..N is a node exactly once", () => {
    const N = 20;
    const g = buildGeometry({ n: N, thetaEvenRad: 8 * DEG, thetaOddRad: 16 * DEG, segLen: 1.6 });

    // Independently union every trajectory; that set IS the node set.
    const union = new Set<number>();
    let totalLen = 0;
    for (let n = 1; n <= N; n++) {
      const t = trajectory(n);
      totalLen += t.length;
      for (const v of t) union.add(v);
    }
    for (let n = 1; n <= N; n++) expect(union.has(n)).toBe(true);

    expect(g.edgeCount + 1).toBe(union.size); // one node per distinct value
    expect(g.edgeCount + 1).toBeLessThan(totalLen); // fewer nodes than Σ lengths
  });

  it("length variance is deterministic, preserves topology, and jitters positions", () => {
    const base = { n: 60, thetaEvenRad: 8 * DEG, thetaOddRad: 16 * DEG, segLen: 1.6 };
    const uniform = buildGeometry({ ...base, lenVar: 0 });
    const varied = buildGeometry({ ...base, lenVar: 0.5 });
    const variedAgain = buildGeometry({ ...base, lenVar: 0.5 });

    // Same tree (only segment lengths change), so edge count and depth are intact.
    expect(varied.edgeCount).toBe(uniform.edgeCount);
    expect(varied.maxDepth).toBe(uniform.maxDepth);
    // Deterministic: identical params -> byte-identical geometry.
    expect([...variedAgain.x1s]).toEqual([...varied.x1s]);
    // But the jitter actually moved nodes vs. the uniform build.
    let moved = 0;
    for (let e = 0; e < uniform.edgeCount; e++) {
      if (Math.abs(uniform.x1s[e] - varied.x1s[e]) > 1e-9) moved++;
    }
    expect(moved).toBeGreaterThan(0);
  });

  it("weights the shared trunk highest (every seed but the root flows through it)", () => {
    const N = 100;
    const g = buildGeometry({ n: N, thetaEvenRad: 8 * DEG, thetaOddRad: 16 * DEG, segLen: 1.6 });
    // The root's only child is value 2 (depth 1); all seeds except 1 pass through it.
    let depth1Weight = 0;
    for (let e = 0; e < g.edgeCount; e++) {
      if (g.depths[e] === 1) depth1Weight = g.weights[e];
    }
    expect(depth1Weight).toBe(N - 1);
    expect(g.maxWeight).toBe(N - 1);
  });
});
