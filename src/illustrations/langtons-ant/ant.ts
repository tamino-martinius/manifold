// Langton's Ant — the pure, DOM-free simulation core (the unit-tested module).
//
// A turmite walks an integer grid. Each cell holds a color index (0 = unvisited,
// the default). The rule string over {L,R,U,N} has one letter per color: on a
// cell of color c the ant turns per rule[c], recolors the cell to (c+1) mod k,
// then steps forward one cell. "RL" is Langton's classic ant.

export type Heading = 0 | 1 | 2 | 3; // N, E, S, W (cyclic, clockwise)
export type Turn = "L" | "R" | "U" | "N";
export type Rule = Turn[]; // length k -> k colors

// Heading -> unit step, world coords with y pointing up (matches the renderer's
// y-flip). Clockwise order so a Right turn is +1 and a Left turn is -1 (mod 4).
const DX = [0, 1, 0, -1] as const; // N, E, S, W
const DY = [1, 0, -1, 0] as const;

// Turn -> change in heading (mod 4). R=clockwise, L=counter-clockwise.
const TURN: Record<Turn, number> = { N: 0, R: 1, U: 2, L: 3 };
const VALID_TURN = /^[LRUN]+$/;

// Pack a signed (x, y) into one JS-double-exact integer. With BIAS = 2^24 each
// coordinate stays in [-2^24, 2^24); the product peaks near 2^24 * 2^25 ≈ 5.6e14,
// comfortably below Number.MAX_SAFE_INTEGER (2^53). Langton reaches only tens of
// thousands of cells in this app, so the bound is never approached.
const BIAS = 1 << 24;
const STRIDE = 1 << 25;

export function pack(x: number, y: number): number {
  return (x + BIAS) * STRIDE + (y + BIAS);
}

export function unpackX(key: number): number {
  return Math.floor(key / STRIDE) - BIAS;
}

export function unpackY(key: number): number {
  return (key % STRIDE) - BIAS;
}

/** Parse a rule string into turns. Throws on empty/invalid (uppercase only). */
export function parseRule(s: string): Rule {
  if (s.length === 0) throw new Error("rule must have at least one letter");
  if (!VALID_TURN.test(s)) throw new Error(`invalid rule "${s}" — use only L R U N`);
  return s.split("") as Turn[];
}

// Recently flipped cells for the optional comet trail, as a bounded ring buffer
// of packed keys. Only written when `trackTrail` is on (it costs one write/step).
const TRAIL_CAP = 256;

// Black-cell history for the classic-ant highway detector: a ring of the last
// (2 * PERIOD + 1) counts, so we can compare a(n), a(n-104), a(n-208) in O(1).
const PERIOD = 104;
const HIST = 2 * PERIOD + 1;
const HIGHWAY_DELTA = 12; // each highway cycle nets +12 black cells (A255938)
const HIGHWAY_MIN_STEP = 9000; // the highway never begins before ~step 10,000

export type AntSim = {
  rule: Rule;
  k: number; // number of colors
  cells: Map<number, number>; // packed coord -> colorIndex (nonzero only)
  x: number;
  y: number;
  h: Heading;
  steps: number;
  blackCount: number; // count of color===1 cells (A255938)
  // Painted bounding box, tracked incrementally (expand-only) so fitBounds is O(1).
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  // --- comet trail (opt-in) ---
  trackTrail: boolean;
  trail: Float64Array; // ring of recently-flipped packed keys
  trailHead: number; // next write index
  trailLen: number; // filled entries (<= TRAIL_CAP)
  // --- highway detection (classic ant only) ---
  detectHighway: boolean;
  highway: boolean; // latches true once the periodic highway is detected
  bcHist: Int32Array; // ring of recent blackCounts
};

function isClassic(rule: Rule): boolean {
  return (
    rule.length === 2 &&
    ((rule[0] === "R" && rule[1] === "L") || (rule[0] === "L" && rule[1] === "R"))
  );
}

/** A fresh simulation: ant at the origin heading north, empty grid. */
export function createSim(rule: Rule): AntSim {
  return {
    rule,
    k: rule.length,
    cells: new Map(),
    x: 0,
    y: 0,
    h: 0,
    steps: 0,
    blackCount: 0,
    minX: 0,
    maxX: 0,
    minY: 0,
    maxY: 0,
    trackTrail: false,
    trail: new Float64Array(TRAIL_CAP),
    trailHead: 0,
    trailLen: 0,
    detectHighway: isClassic(rule),
    highway: false,
    bcHist: new Int32Array(HIST),
  };
}

/** Advance the simulation by exactly one move (mutates `sim`). */
export function step(sim: AntSim): void {
  const key = pack(sim.x, sim.y);
  const c = sim.cells.get(key) ?? 0;

  // 1. turn per the current cell's color.
  sim.h = ((sim.h + TURN[sim.rule[c]]) % 4) as Heading;

  // 2. recolor the cell to (c + 1) mod k; keep only nonzero cells in the map.
  const nc = (c + 1) % sim.k;
  if (nc === 0) sim.cells.delete(key);
  else sim.cells.set(key, nc);

  // black-cell count (specifically color === 1).
  if (c === 1) sim.blackCount--;
  if (nc === 1) sim.blackCount++;

  // expand the painted bbox when the cell is now painted.
  if (nc !== 0) {
    if (sim.x < sim.minX) sim.minX = sim.x;
    else if (sim.x > sim.maxX) sim.maxX = sim.x;
    if (sim.y < sim.minY) sim.minY = sim.y;
    else if (sim.y > sim.maxY) sim.maxY = sim.y;
  }

  if (sim.trackTrail) {
    sim.trail[sim.trailHead] = key;
    sim.trailHead = (sim.trailHead + 1) % TRAIL_CAP;
    if (sim.trailLen < TRAIL_CAP) sim.trailLen++;
  }

  // 3. step forward one cell along the new heading.
  sim.x += DX[sim.h];
  sim.y += DY[sim.h];
  sim.steps++;

  if (sim.detectHighway && !sim.highway) detectHighway(sim);
}

/** Advance the simulation by `n` moves. */
export function stepN(sim: AntSim, n: number): void {
  for (let i = 0; i < n; i++) step(sim);
}

// Cheap heuristic (spec §9b): once past the chaos, the classic ant's black count
// rises by exactly +12 every 104 steps. Declare the highway after two consecutive
// such cycles. Records blackCount into a ring so a(n) - a(n-104) is O(1).
function detectHighway(sim: AntSim): void {
  const i = sim.steps % HIST;
  sim.bcHist[i] = sim.blackCount;
  if (sim.steps < HIGHWAY_MIN_STEP || sim.steps < 2 * PERIOD) return;
  const now = sim.blackCount;
  const prev = sim.bcHist[(sim.steps - PERIOD + HIST) % HIST];
  const prev2 = sim.bcHist[(sim.steps - 2 * PERIOD + HIST) % HIST];
  if (now - prev === HIGHWAY_DELTA && prev - prev2 === HIGHWAY_DELTA) sim.highway = true;
}

/** Recently-flipped cells (newest last) for the comet trail renderer. */
export function trailKeys(sim: AntSim): number[] {
  const out: number[] = [];
  for (let i = 0; i < sim.trailLen; i++) {
    out.push(sim.trail[(sim.trailHead - sim.trailLen + i + TRAIL_CAP) % TRAIL_CAP]);
  }
  return out;
}
