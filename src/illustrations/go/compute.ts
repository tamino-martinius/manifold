import { coordToIndex, spiralCoordAt } from "../chessboard/spiral";
import { type Board, cellKey, keyX, keyY, resolveMove } from "./gorules";
import type { GoData } from "./types";

const PROGRESS_INTERVAL = 2048;

// Deterministic 64-bit Zobrist value for (cellKey, colorIdx) via a splitmix-style
// mix — no Math.random, so runs are reproducible. XORing these per stone gives an
// order-independent board hash for positional superko.
const MASK64 = (1n << 64n) - 1n;
function zob(key: number, color: number): bigint {
  let h = (BigInt(key) * 0x9e3779b97f4a7c15n + BigInt(color + 1) * 0xbf58476d1ce4e5b9n) & MASK64;
  h = ((h ^ (h >> 30n)) * 0xbf58476d1ce4e5b9n) & MASK64;
  h = ((h ^ (h >> 27n)) * 0x94d049bb133111ebn) & MASK64;
  return (h ^ (h >> 31n)) & MASK64;
}

const EMPTY: GoData = {
  count: 0,
  placedX: new Int32Array(0),
  placedY: new Int32Array(0),
  placedColor: new Uint8Array(0),
  capOffset: new Uint32Array(1),
  capX: new Int32Array(0),
  capY: new Int32Array(0),
  capColor: new Uint8Array(0),
  halfX: new Uint16Array(0),
  halfY: new Uint16Array(0),
  colors: [],
};

export function computeGoMoves(
  pattern: string[],
  maxMoves: number,
  onProgress?: (done: number) => void,
): GoData {
  if (pattern.length === 0 || maxMoves <= 0) {
    onProgress?.(Math.max(0, maxMoves));
    return EMPTY;
  }

  // Distinct colors in first-seen order → indices; the per-turn color sequence.
  const colors: string[] = [];
  const idxByHex = new Map<string, number>();
  const patternIdx = pattern.map((hex) => {
    let i = idxByHex.get(hex);
    if (i === undefined) {
      i = colors.length;
      idxByHex.set(hex, i);
      colors.push(hex);
    }
    return i;
  });

  const board: Board = new Map();
  // Empty cells below `frontier` (all cells >= frontier are pristine/empty), kept
  // sorted ascending so the lowest legal cell is found by scanning holes then the
  // frontier. Captures reopen low cells → inserted here.
  const holes: number[] = [];
  let frontier = 0;
  let hash = 0n;
  const seen = new Set<bigint>([0n]); // include the empty board (superko)

  const placedX: number[] = [];
  const placedY: number[] = [];
  const placedColor: number[] = [];
  const capXs: number[] = [];
  const capYs: number[] = [];
  const capColors: number[] = [];
  const capCount: number[] = [];
  const halfXs: number[] = [];
  const halfYs: number[] = [];
  let curHalfX = 0;
  let curHalfY = 0;

  const insertHole = (idx: number): void => {
    let lo = 0;
    let hi = holes.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (holes[mid] < idx) lo = mid + 1;
      else hi = mid;
    }
    holes.splice(lo, 0, idx);
  };

  for (let turn = 0; turn < maxMoves; turn++) {
    const color = patternIdx[turn % patternIdx.length];

    let chosenIndex = -1;
    let cx = 0;
    let cy = 0;
    let captured: number[] = [];

    // 1) Lowest hole (empty cell below the frontier) that is a legal, non-repeating move.
    for (let h = 0; h < holes.length; h++) {
      const idx = holes[h];
      const co = spiralCoordAt(idx);
      const res = resolveMove(board, co.x, co.y, color);
      if (!res.legal) continue;
      let wh = hash ^ zob(cellKey(co.x, co.y), color);
      for (const ck of res.captured) wh ^= zob(ck, board.get(ck) as number);
      if (seen.has(wh)) continue; // positional superko
      chosenIndex = idx;
      cx = co.x;
      cy = co.y;
      captured = res.captured;
      holes.splice(h, 1);
      break;
    }

    // 2) Otherwise the frontier cell — always legal (a pristine higher-indexed
    //    neighbour is an empty liberty) and always a brand-new position.
    if (chosenIndex === -1) {
      const co = spiralCoordAt(frontier);
      const res = resolveMove(board, co.x, co.y, color);
      chosenIndex = frontier;
      cx = co.x;
      cy = co.y;
      captured = res.captured;
      frontier++;
    }

    // Commit.
    const key = cellKey(cx, cy);
    board.set(key, color);
    hash ^= zob(key, color);
    let capN = 0;
    for (const ck of captured) {
      const cc = board.get(ck) as number;
      hash ^= zob(ck, cc);
      board.delete(ck);
      capXs.push(keyX(ck));
      capYs.push(keyY(ck));
      capColors.push(cc);
      capN++;
      const ci = coordToIndex(keyX(ck), keyY(ck)) - 1; // reopened low cell → hole
      insertHole(ci);
    }
    seen.add(hash);

    placedX.push(cx);
    placedY.push(cy);
    placedColor.push(color);
    capCount.push(capN);
    if (Math.abs(cx) > curHalfX) curHalfX = Math.abs(cx);
    if (Math.abs(cy) > curHalfY) curHalfY = Math.abs(cy);
    halfXs.push(curHalfX);
    halfYs.push(curHalfY);

    if (onProgress && (turn + 1) % PROGRESS_INTERVAL === 0) onProgress(turn + 1);
  }
  onProgress?.(maxMoves);

  const count = placedX.length;
  const capOffset = new Uint32Array(count + 1);
  for (let m = 0; m < count; m++) capOffset[m + 1] = capOffset[m] + capCount[m];

  return {
    count,
    placedX: Int32Array.from(placedX),
    placedY: Int32Array.from(placedY),
    placedColor: Uint8Array.from(placedColor),
    capOffset,
    capX: Int32Array.from(capXs),
    capY: Int32Array.from(capYs),
    capColor: Uint8Array.from(capColors),
    halfX: Uint16Array.from(halfXs),
    halfY: Uint16Array.from(halfYs),
    colors,
  };
}
