// Pure Go legality on an unbounded board: cell-key encoding, group flood-fill
// with liberty counting, and a move resolver that reports legality + captures.
// Superko and the spiral live elsewhere; this file knows nothing about them.

/** cellKey → colorIdx. A cell absent from the map is empty. */
export type Board = Map<number, number>;

export const NEIGHBORS: readonly [number, number][] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

// Encode (x, y) as one integer. ±8191 comfortably covers the ~510 spiral radius
// of a 1M-move fill, and the key stays < 2^31 so the Map keeps fast integer keys.
const OFFSET = 8192;
const STRIDE = 16384;

export function cellKey(x: number, y: number): number {
  return (x + OFFSET) * STRIDE + (y + OFFSET);
}
export function keyX(key: number): number {
  return Math.floor(key / STRIDE) - OFFSET;
}
export function keyY(key: number): number {
  return (key % STRIDE) - OFFSET;
}

/**
 * Flood-fill the maximal same-color group containing (x, y) and count its
 * distinct empty-neighbour cells (liberties). Assumes (x, y) holds `color`
 * (either really, or tentatively placed by the caller).
 */
export function groupInfo(
  board: Board,
  x: number,
  y: number,
  color: number,
): { stones: number[]; liberties: number } {
  const start = cellKey(x, y);
  const stones: number[] = [];
  const seen = new Set<number>([start]);
  const libs = new Set<number>();
  const stack: [number, number][] = [[x, y]];
  while (stack.length > 0) {
    const [cx, cy] = stack.pop() as [number, number];
    stones.push(cellKey(cx, cy));
    for (const [dx, dy] of NEIGHBORS) {
      const nx = cx + dx;
      const ny = cy + dy;
      const nk = cellKey(nx, ny);
      const nc = board.get(nk);
      if (nc === undefined) {
        libs.add(nk);
      } else if (nc === color && !seen.has(nk)) {
        seen.add(nk);
        stack.push([nx, ny]);
      }
    }
  }
  return { stones, liberties: libs.size };
}

/**
 * Decide whether `color` may play (x, y) on `board` and which enemy stones the
 * move captures. Captures are resolved first (standard Go), then suicide is
 * checked. Leaves `board` unchanged on return.
 */
export function resolveMove(
  board: Board,
  x: number,
  y: number,
  color: number,
): { legal: boolean; captured: number[] } {
  const key = cellKey(x, y);
  board.set(key, color); // tentatively place, so enemy liberties see it
  const captured = new Set<number>();
  for (const [dx, dy] of NEIGHBORS) {
    const nx = x + dx;
    const ny = y + dy;
    const nk = cellKey(nx, ny);
    const nc = board.get(nk);
    if (nc !== undefined && nc !== color && !captured.has(nk)) {
      const g = groupInfo(board, nx, ny, nc);
      if (g.liberties === 0) for (const s of g.stones) captured.add(s);
    }
  }
  let legal: boolean;
  let capturedArr: number[];
  if (captured.size > 0) {
    legal = true;
    capturedArr = [...captured];
  } else {
    legal = groupInfo(board, x, y, color).liberties > 0;
    capturedArr = [];
  }
  board.delete(key); // restore — net zero mutation
  return { legal, captured: capturedArr };
}
