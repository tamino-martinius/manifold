import { addPt, pointKey, pointToScreen, rotateDir, rotatePt } from "./geometry";
import { createPicker } from "./strategy";
import type { DockSpec, Instance, PlacedData, Segment, Shape, StrategyKind } from "./types";

// Safety ceiling on total placed toothpicks (matches the chessboard render
// envelope). A generation that would exceed it truncates the structure.
export const MAX_INSTANCES = 2_000_000;

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
  const occupied = new Set<number>();
  // Seed: one exposed dock at the origin facing East, so a Straight first shape
  // renders as the classic single vertical toothpick of stage 1.
  let exposed: DockSpec[] = [{ at: { p: 0, q: 0, r: 0, s: 0 }, dir: 0 }];

  for (let gen = 0; gen < maxGen; gen++) {
    if (exposed.length === 0) break;
    const shape = picker.next(); // one shape for the whole generation
    const candidates: Candidate[] = [];

    for (const dock of exposed) {
      occupied.add(pointKey(dock.at)); // in-dock consumed → internal
      const segments: Segment[] = [];
      for (const v of shape.visual) {
        segments.push({
          a: addPt(dock.at, rotatePt(v.a, dock.dir)),
          b: addPt(dock.at, rotatePt(v.b, dock.dir)),
        });
      }
      instances.push({ generation: gen, color: shape.color, segments });
      for (const od of shape.outDocks) {
        const at = addPt(dock.at, rotatePt(od.at, dock.dir));
        candidates.push({ dock: { at, dir: rotateDir(od.dir, dock.dir) }, key: pointKey(at) });
      }
    }

    // Cap: a candidate survives only if it is the unique claim on its lattice
    // point AND that point is not already occupied. Coincident open docks cancel.
    const tally = new Map<number, number>();
    for (const c of candidates) tally.set(c.key, (tally.get(c.key) ?? 0) + 1);
    const next: DockSpec[] = [];
    for (const c of candidates) {
      if (tally.get(c.key) === 1 && !occupied.has(c.key)) next.push(c.dock);
    }
    // Mark EVERY candidate point occupied — including cancelled ones. A point
    // where two open docks met is now part of the structure, so a later
    // generation that reaches it must cap there too. Occupying only survivors
    // would silently break cross-generation capping (and A139250).
    for (const c of candidates) occupied.add(c.key);
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
  };
}
