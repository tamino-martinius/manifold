import { pointKey, rotateDir, rotatePoint } from "./geometry";
import { createPicker } from "./strategy";
import type { Dir, Instance, PlacedData, Segment, Shape, StrategyKind } from "./types";

// Safety ceiling on total placed toothpicks (matches the chessboard render
// envelope). A generation that would exceed it truncates the structure.
export const MAX_INSTANCES = 2_000_000;

type Candidate = { x: number; y: number; dir: Dir; key: number };
type LiveDock = { x: number; y: number; dir: Dir };

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
  let exposed: LiveDock[] = [{ x: 0, y: 0, dir: 0 }];

  for (let gen = 0; gen < maxGen; gen++) {
    if (exposed.length === 0) break;
    const shape = picker.next(); // one shape for the whole generation
    const candidates: Candidate[] = [];

    for (const dock of exposed) {
      occupied.add(pointKey(dock.x, dock.y)); // in-dock consumed → internal
      const segments: Segment[] = [];
      for (const v of shape.visual) {
        const [ax, ay] = rotatePoint(v.x1, v.y1, dock.dir);
        const [bx, by] = rotatePoint(v.x2, v.y2, dock.dir);
        segments.push({ x1: dock.x + ax, y1: dock.y + ay, x2: dock.x + bx, y2: dock.y + by });
      }
      instances.push({ generation: gen, color: shape.color, segments });
      for (const od of shape.outDocks) {
        const [rx, ry] = rotatePoint(od.dx, od.dy, dock.dir);
        const x = dock.x + rx;
        const y = dock.y + ry;
        candidates.push({ x, y, dir: rotateDir(od.dir, dock.dir), key: pointKey(x, y) });
      }
    }

    // Cap: a candidate survives only if it is the unique claim on its lattice
    // point AND that point is not already occupied. Coincident open docks cancel.
    const tally = new Map<number, number>();
    for (const c of candidates) tally.set(c.key, (tally.get(c.key) ?? 0) + 1);
    const next: LiveDock[] = [];
    for (const c of candidates) {
      if (tally.get(c.key) === 1 && !occupied.has(c.key)) {
        next.push({ x: c.x, y: c.y, dir: c.dir });
      }
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

  const x1 = new Int32Array(segCount);
  const y1 = new Int32Array(segCount);
  const x2 = new Int32Array(segCount);
  const y2 = new Int32Array(segCount);
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
      x1[si] = s.x1;
      y1[si] = s.y1;
      x2[si] = s.x2;
      y2[si] = s.y2;
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
