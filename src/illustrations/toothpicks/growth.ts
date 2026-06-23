import { addPt, pointKey, pointToScreen, rotateDir, rotatePt } from "./geometry";
import { createPicker } from "./strategy";
import type { DockSpec, Instance, PlacedData, Pt, Segment, Shape, StrategyKind } from "./types";

// Safety ceiling on total placed toothpicks (matches the chessboard render envelope).
export const MAX_INSTANCES = 2_000_000;

/**
 * The lattice points a segment a→b covers, inclusive. Every preset segment runs
 * along a single 8-direction, so the delta is k·UNIT[d] (exactly one nonzero
 * component); k = |Δp|+|Δq|+|Δr|+|Δs| and the points are a + i·(delta/k).
 */
export function segmentPoints(a: Pt, b: Pt): Pt[] {
  const dp = b.p - a.p;
  const dq = b.q - a.q;
  const dr = b.r - a.r;
  const ds = b.s - a.s;
  const k = Math.abs(dp) + Math.abs(dq) + Math.abs(dr) + Math.abs(ds);
  if (k === 0) return [a];
  const up = dp / k;
  const uq = dq / k;
  const ur = dr / k;
  const us = ds / k;
  const pts: Pt[] = [];
  for (let i = 0; i <= k; i++) {
    pts.push({ p: a.p + up * i, q: a.q + uq * i, r: a.r + ur * i, s: a.s + us * i });
  }
  return pts;
}

type Candidate = { dock: DockSpec; key: number };

export function computeToothpicks(
  shapes: Shape[],
  strategy: StrategyKind,
  maxGen: number,
  onProgress?: (generation: number) => void,
): Instance[] {
  if (shapes.length === 0 || maxGen <= 0) return [];

  const picker = createPicker(strategy, shapes);
  const instances: Instance[] = [];
  // Per lattice point: how many toothpick ENDPOINTS sit there, and whether any
  // toothpick BODY passes through it. An open end is free only if it is the sole
  // endpoint at its point and no body crosses it.
  const endpointCount = new Map<number, number>();
  const interior = new Set<number>();
  let exposed: DockSpec[] = [{ at: { p: 0, q: 0, r: 0, s: 0 }, dir: 0 }];

  for (let gen = 0; gen < maxGen; gen++) {
    if (exposed.length === 0) break;
    const shape = picker.next(); // one shape for the whole generation
    const candidates: Candidate[] = [];

    // Place every shape first (recording endpoints + interior) so that siblings
    // within this generation also count when we test the candidates below.
    for (const dock of exposed) {
      const segments: Segment[] = [];
      for (const v of shape.visual) {
        const a = addPt(dock.at, rotatePt(v.a, dock.dir));
        const b = addPt(dock.at, rotatePt(v.b, dock.dir));
        segments.push({ a, b });
        const aKey = pointKey(a);
        const bKey = pointKey(b);
        endpointCount.set(aKey, (endpointCount.get(aKey) ?? 0) + 1);
        endpointCount.set(bKey, (endpointCount.get(bKey) ?? 0) + 1);
        const pts = segmentPoints(a, b);
        for (let i = 1; i < pts.length - 1; i++) interior.add(pointKey(pts[i]));
      }
      instances.push({ generation: gen, color: shape.color, segments });
      for (const od of shape.outDocks) {
        const at = addPt(dock.at, rotatePt(od.at, dock.dir));
        candidates.push({ dock: { at, dir: rotateDir(od.dir, dock.dir) }, key: pointKey(at) });
      }
    }

    // An out-dock stays exposed iff it is the sole toothpick endpoint at its point
    // AND no toothpick body passes through it — caps at a junction OR mid-body.
    const next: DockSpec[] = [];
    for (const c of candidates) {
      if (endpointCount.get(c.key) === 1 && !interior.has(c.key)) next.push(c.dock);
    }
    exposed = next;

    onProgress?.(gen + 1);
    if (instances.length >= MAX_INSTANCES) break;
  }

  onProgress?.(maxGen);
  return instances;
}

/** Pack instances into the columnar {@link PlacedData} form (worker-transferable). */
export function packToothpicks(instances: Instance[]): PlacedData {
  let segCount = 0;
  for (const inst of instances) segCount += inst.segments.length;

  const x1 = new Float32Array(segCount);
  const y1 = new Float32Array(segCount);
  const x2 = new Float32Array(segCount);
  const y2 = new Float32Array(segCount);
  const colorIndex = new Uint8Array(segCount);
  const instanceIndex = new Uint32Array(segCount);
  const colors: string[] = [];
  const colorMap = new Map<string, number>();
  const genEnds: number[] = [];
  const genSegEnds: number[] = [];

  let si = 0;
  for (let k = 0; k < instances.length; k++) {
    const inst = instances[k];
    let ci = colorMap.get(inst.color);
    if (ci === undefined) {
      ci = colors.length;
      colorMap.set(inst.color, ci);
      colors.push(inst.color);
    }
    for (const s of inst.segments) {
      const a = pointToScreen(s.a);
      const b = pointToScreen(s.b);
      x1[si] = a.x;
      y1[si] = a.y;
      x2[si] = b.x;
      y2[si] = b.y;
      colorIndex[si] = ci;
      instanceIndex[si] = k;
      si++;
    }
    genEnds[inst.generation] = k + 1; // cumulative instances through this gen
    genSegEnds[inst.generation] = si; // cumulative segments through this gen
  }

  return {
    x1,
    y1,
    x2,
    y2,
    colorIndex,
    instanceIndex,
    colors,
    count: instances.length,
    segCount,
    genEnds,
    genSegEnds,
  };
}
