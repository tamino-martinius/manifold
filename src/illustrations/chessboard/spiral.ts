import type { Coord } from "./types";

const DIRS: Coord[] = [
  { x: 1, y: 0 }, // E
  { x: 0, y: 1 }, // N
  { x: -1, y: 0 }, // W
  { x: 0, y: -1 }, // S
];

// Persistent memoized spiral walk. `cache[i]` is the coord of spiral index i+1;
// `reverse` maps "x,y" -> 1-based index. The walk state (below) lets us resume
// extending the cache mid-run without recomputing from the start.
const cache: Coord[] = [{ x: 0, y: 0 }];
const reverse = new Map<string, number>([["0,0", 1]]);
let cx = 0;
let cy = 0;
let dir = 0;
let runLength = 1;
let stepsLeftInRun = 1;
let runsAtLength = 0;

function extendTo(count: number): void {
  while (cache.length < count) {
    if (stepsLeftInRun === 0) {
      dir = (dir + 1) % 4;
      runsAtLength++;
      if (runsAtLength === 2) {
        runsAtLength = 0;
        runLength++;
      }
      stepsLeftInRun = runLength;
    }
    const d = DIRS[dir];
    cx += d.x;
    cy += d.y;
    stepsLeftInRun--;
    cache.push({ x: cx, y: cy });
    reverse.set(`${cx},${cy}`, cache.length);
  }
}

export function spiralCoords(count: number): Coord[] {
  if (count <= 0) return [];
  extendTo(count);
  return cache.slice(0, count).map((c) => ({ x: c.x, y: c.y }));
}

export function indexToCoord(n: number): Coord {
  if (n < 1) throw new Error(`spiral index must be >= 1, got ${n}`);
  extendTo(n);
  const c = cache[n - 1];
  return { x: c.x, y: c.y };
}

export function coordToIndex(x: number, y: number): number {
  const r = Math.max(Math.abs(x), Math.abs(y));
  const ringEnd = (2 * r + 1) ** 2; // last spiral index on Chebyshev ring r
  extendTo(ringEnd);
  const idx = reverse.get(`${x},${y}`);
  if (idx === undefined) throw new Error(`coord (${x}, ${y}) not found`);
  return idx;
}
