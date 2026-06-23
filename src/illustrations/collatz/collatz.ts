// Pure Collatz math + the deduped-tree geometry build.
//
// Every reversed trajectory is a path from the shared root (value 1) through the
// Collatz tree (edge a -> b iff T(b) = a, i.e. b is a predecessor of a). All
// trajectories share this tree, so a node's position/heading/depth is intrinsic
// to its value and computed exactly once. The build returns a flat, columnar set
// of edges (typed arrays) plus per-edge depth + multiplicity, ready to render and
// cheap to keep around.

/** Columnar edge set for the coral, plus its bounding box and reveal extents. */
export type CollatzGeometry = {
  // One entry per tree edge (parent -> child). Length === edgeCount.
  x0s: Float64Array; // parent x
  y0s: Float64Array; // parent y
  x1s: Float64Array; // child x
  y1s: Float64Array; // child y
  depths: Int32Array; // child depth (distance from the root in steps)
  weights: Float32Array; // multiplicity: seeds whose trajectory passes through the child
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  maxDepth: number;
  maxWeight: number;
  edgeCount: number;
};

export const EMPTY_GEOM: CollatzGeometry = {
  x0s: new Float64Array(0),
  y0s: new Float64Array(0),
  x1s: new Float64Array(0),
  y1s: new Float64Array(0),
  depths: new Int32Array(0),
  weights: new Float32Array(0),
  minX: 0,
  maxX: 0,
  minY: 0,
  maxY: 0,
  maxDepth: 0,
  maxWeight: 1,
  edgeCount: 0,
};

// Heading convention (pinned so the geometry is reproducible): world-up-positive.
// The root points straight "up" (+y); `worldToScreen` flips y so +y reads up on
// screen. Even steps turn one way (+thetaEven), odd steps the other (-thetaOdd).
export const START_HEADING = Math.PI / 2;

/** True for even v. Uses `% 2` (not `& 1`) so it stays correct past 2^31, which
 *  Collatz peaks can exceed for the seeds we render. */
export function isEven(v: number): boolean {
  return v % 2 === 0;
}

/** One Collatz step, toward 1. */
export function collatzNext(n: number): number {
  return isEven(n) ? n / 2 : 3 * n + 1;
}

/** The full trajectory of n down to 1, e.g. trajectory(6) = [6,3,10,5,16,8,4,2,1]. */
export function trajectory(n: number): number[] {
  if (n < 1) throw new Error(`trajectory requires n >= 1, got ${n}`);
  const out = [n];
  let v = n;
  while (v !== 1) {
    v = collatzNext(v);
    out.push(v);
  }
  return out;
}

// Memoized total stopping time (OEIS A006577). Module-level so repeated calls and
// the geometry build share the work; safe because it's a pure function of v.
const stepsCache = new Map<number, number>([[1, 0]]);

/** Total stopping time of n: steps to reach 1 (A006577). stepsToOne(1) = 0. */
export function stepsToOne(n: number): number {
  if (n < 1) throw new Error(`stepsToOne requires n >= 1, got ${n}`);
  const stack: number[] = [];
  let v = n;
  while (!stepsCache.has(v)) {
    stack.push(v);
    v = collatzNext(v);
  }
  // `v` is the nearest already-known value; walk back out filling the cache.
  let steps = stepsCache.get(v) as number;
  for (let i = stack.length - 1; i >= 0; i--) {
    steps += 1;
    stepsCache.set(stack[i], steps);
  }
  return stepsCache.get(n) as number;
}

export type BuildParams = {
  n: number; // seeds 1..n
  thetaEvenRad: number; // even-step turn (radians)
  thetaOddRad: number; // odd-step turn (radians)
  segLen: number; // base segment length (world units)
  lenVar?: number; // per-node length jitter, 0..1 (0 = uniform); deterministic per value
};

// Deterministic hash of a (possibly > 2^32) integer to [0, 1). Used for the
// per-node segment-length jitter so a value's geometry stays reproducible and the
// shared tree stays shared (same value -> same length).
function hash01(v: number): number {
  let h = ((v >>> 0) ^ Math.floor(v / 4294967296)) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/**
 * Build the deduped Collatz tree for seeds 1..n and pack it into columnar edges.
 * O(unique nodes + n): each value becomes a node exactly once; each seed walks
 * down only until it joins the already-built tree. Multiplicity (how many seeds'
 * trajectories pass through an edge's child) is accumulated for trunk weighting.
 */
export function buildGeometry(p: BuildParams): CollatzGeometry {
  const N = Math.max(1, Math.floor(p.n));
  const L = p.segLen;
  const lenVar = p.lenVar ?? 0;
  const tE = p.thetaEvenRad;
  const tO = p.thetaOddRad;

  // Node columns. Index 0 is always the root (value 1) at the origin.
  const value: number[] = [1];
  const parent: number[] = [-1];
  const xs: number[] = [0];
  const ys: number[] = [0];
  const heading: number[] = [START_HEADING];
  const depth: number[] = [0];
  const index = new Map<number, number>([[1, 0]]);

  // Ensure a node exists for value v, creating any missing ancestors first.
  const ensure = (v: number): void => {
    if (index.has(v)) return;
    const chain: number[] = [];
    let cur = v;
    while (!index.has(cur)) {
      chain.push(cur);
      cur = collatzNext(cur); // walk down toward the existing tree
    }
    let parentId = index.get(cur) as number;
    // Create from the join point outward (chain is ordered far -> near the join).
    for (let i = chain.length - 1; i >= 0; i--) {
      const val = chain[i];
      const h = heading[parentId] + (isEven(val) ? tE : -tO);
      // Per-node length jitter in [0.1, 2]·L, deterministic on the value.
      const len = lenVar > 0 ? L * Math.max(0.1, 1 + lenVar * (2 * hash01(val) - 1)) : L;
      const id = value.length;
      value.push(val);
      parent.push(parentId);
      xs.push(xs[parentId] + len * Math.cos(h));
      ys.push(ys[parentId] + len * Math.sin(h));
      heading.push(h);
      depth.push(depth[parentId] + 1);
      index.set(val, id);
      parentId = id;
    }
  };

  for (let n = 1; n <= N; n++) ensure(n);

  const nodeCount = value.length;

  // Multiplicity: number of seeds (values <= N) in each node's subtree. Process
  // nodes deepest-first (counting sort by depth) so every child folds into its
  // parent before the parent is read.
  let maxDepth = 0;
  const seedCount = new Float64Array(nodeCount);
  for (let i = 0; i < nodeCount; i++) {
    seedCount[i] = value[i] <= N ? 1 : 0;
    if (depth[i] > maxDepth) maxDepth = depth[i];
  }
  const byDepth = sortIndicesByDepth(depth, nodeCount, maxDepth);
  for (let k = nodeCount - 1; k >= 0; k--) {
    const id = byDepth[k];
    const par = parent[id];
    if (par >= 0) seedCount[par] += seedCount[id];
  }

  // Pack one edge per non-root node.
  const edgeCount = nodeCount - 1;
  const x0s = new Float64Array(edgeCount);
  const y0s = new Float64Array(edgeCount);
  const x1s = new Float64Array(edgeCount);
  const y1s = new Float64Array(edgeCount);
  const depths = new Int32Array(edgeCount);
  const weights = new Float32Array(edgeCount);
  let minX = 0;
  let maxX = 0;
  let minY = 0;
  let maxY = 0; // root (0,0) is included by the initial bounds
  let maxWeight = 1;
  for (let id = 1; id < nodeCount; id++) {
    const e = id - 1;
    const par = parent[id];
    x0s[e] = xs[par];
    y0s[e] = ys[par];
    x1s[e] = xs[id];
    y1s[e] = ys[id];
    depths[e] = depth[id];
    const w = seedCount[id];
    weights[e] = w;
    if (w > maxWeight) maxWeight = w;
    const x = xs[id];
    const y = ys[id];
    if (x < minX) minX = x;
    else if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    else if (y > maxY) maxY = y;
  }

  return {
    x0s,
    y0s,
    x1s,
    y1s,
    depths,
    weights,
    minX,
    maxX,
    minY,
    maxY,
    maxDepth,
    maxWeight,
    edgeCount,
  };
}

/** Node indices sorted by ascending depth (counting sort, O(nodeCount)). */
function sortIndicesByDepth(depth: number[], nodeCount: number, maxDepth: number): Int32Array {
  const start = new Int32Array(maxDepth + 2);
  for (let i = 0; i < nodeCount; i++) start[depth[i] + 1]++;
  for (let d = 0; d < maxDepth + 1; d++) start[d + 1] += start[d];
  const out = new Int32Array(nodeCount);
  const cursor = start.slice(0, maxDepth + 1);
  for (let i = 0; i < nodeCount; i++) {
    const d = depth[i];
    out[cursor[d]++] = i;
  }
  return out;
}
