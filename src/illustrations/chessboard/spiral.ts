import type { Coord } from "./types";

const DIRS: Coord[] = [
  { x: 1, y: 0 }, // E
  { x: 0, y: 1 }, // N
  { x: -1, y: 0 }, // W
  { x: 0, y: -1 }, // S
];

export function spiralCoords(count: number): Coord[] {
  const out: Coord[] = [];
  if (count <= 0) return out;
  let x = 0;
  let y = 0;
  out.push({ x, y }); // index 1
  let dir = 0;
  let runLength = 1;
  let runsAtLength = 0;
  while (out.length < count) {
    const d = DIRS[dir];
    for (let step = 0; step < runLength && out.length < count; step++) {
      x += d.x;
      y += d.y;
      out.push({ x, y });
    }
    dir = (dir + 1) % 4;
    runsAtLength++;
    if (runsAtLength === 2) {
      runsAtLength = 0;
      runLength++;
    }
  }
  return out;
}

export function indexToCoord(n: number): Coord {
  if (n < 1) throw new Error(`spiral index must be >= 1, got ${n}`);
  return spiralCoords(n)[n - 1];
}

export function coordToIndex(x: number, y: number): number {
  // Ring r = Chebyshev distance from origin; ring r spans indices
  // (2r-1)^2 + 1 .. (2r+1)^2. Walk that ring to find the match.
  const r = Math.max(Math.abs(x), Math.abs(y));
  if (r === 0) return 1;
  const ringStartIndex = (2 * r - 1) ** 2 + 1;
  const ringLength = 8 * r;
  const coords = spiralCoords(ringStartIndex + ringLength - 1);
  for (let i = ringStartIndex - 1; i < coords.length; i++) {
    if (coords[i].x === x && coords[i].y === y) return i + 1;
  }
  throw new Error(`coord (${x}, ${y}) not found on ring ${r}`);
}
