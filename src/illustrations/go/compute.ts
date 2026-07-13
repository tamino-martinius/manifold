import { spiralCoordAt } from "../chessboard/spiral";
import { createField } from "./field";
import type { GoData } from "./types";

const PROGRESS_INTERVAL = 2048;

// Positional superko via two independent 32-bit Zobrist accumulators combined
// into one 53-bit JS-number key (exact in a double). Numeric, not BigInt, so
// hashing stays cheap; keyed by a cell's flat field index + colorVal. XORing per
// stone gives an order-independent, incrementally-maintained board hash.
function zobA(idx: number, colVal: number): number {
  let h = (idx ^ Math.imul(colVal, 0x9e3779b1)) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
}
function zobB(idx: number, colVal: number): number {
  let h = (Math.imul(idx, 0x85ebca77) ^ Math.imul(colVal, 0xc2b2ae3d)) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 0x27d4eb2f) >>> 0;
  return (h ^ (h >>> 15)) >>> 0;
}
// 31 bits of A + 22 bits of B → a 53-bit key (< 2^53, exact as a double).
const posKey = (a: number, b: number): number => (a & 0x7fffffff) * 4194304 + (b & 0x3fffff);

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

  // The spiral fill of `maxMoves` cells stays inside this radius; +3 pads the
  // border so the flat field's neighbour reads never touch a live cell.
  const radius = Math.floor(Math.ceil(Math.sqrt(maxMoves)) / 2) + 3;
  const field = createField(radius);
  // Spiral index of the stone occupying each cell — so a capture can reopen its
  // cell at the exact index it was placed, without a coord→index reverse lookup.
  const cellSpiral = new Int32Array(field.SIDE * field.SIDE);

  // Empty cells below `frontier` (all cells >= frontier are pristine/empty), kept
  // sorted ascending so the lowest legal cell is found by scanning holes then the
  // frontier. Captures reopen low cells → inserted here.
  const holes: number[] = [];
  let frontier = 0;
  let hashA = 0;
  let hashB = 0;
  const seen = new Set<number>([posKey(0, 0)]); // include the empty board (superko)

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
    const colVal = color + 1;

    let chosenSpiral = -1;
    let chosenCell = 0;
    let capN = 0;

    // 1) Lowest hole (empty cell below the frontier) that is a legal, non-repeating move.
    for (let h = 0; h < holes.length; h++) {
      const si = holes[h];
      const co = spiralCoordAt(si);
      const cell = field.index(co.x, co.y);
      const res = field.resolveAt(cell, colVal);
      if (!res.legal) continue;
      let a = hashA ^ zobA(cell, colVal);
      let b = hashB ^ zobB(cell, colVal);
      for (let i = 0; i < res.count; i++) {
        const s = field.captured[i];
        const cv = field.colorAt(s);
        a ^= zobA(s, cv);
        b ^= zobB(s, cv);
      }
      if (seen.has(posKey(a, b))) continue; // positional superko
      chosenSpiral = si;
      chosenCell = cell;
      capN = res.count;
      holes.splice(h, 1);
      break;
    }

    // 2) Otherwise the frontier cell — always legal (a pristine higher-indexed
    //    neighbour is an empty liberty) and always a brand-new position.
    if (chosenSpiral === -1) {
      const co = spiralCoordAt(frontier);
      chosenCell = field.index(co.x, co.y);
      capN = field.resolveAt(chosenCell, colVal).count;
      chosenSpiral = frontier;
      frontier++;
    }

    // Commit. `field.captured[0..capN)` still holds the chosen move's captures
    // (no resolveAt call intervened between selection and here).
    field.set(chosenCell, colVal);
    cellSpiral[chosenCell] = chosenSpiral;
    hashA ^= zobA(chosenCell, colVal);
    hashB ^= zobB(chosenCell, colVal);
    for (let i = 0; i < capN; i++) {
      const s = field.captured[i];
      const cv = field.colorAt(s);
      hashA ^= zobA(s, cv);
      hashB ^= zobB(s, cv);
      field.clear(s);
      capXs.push(field.xOf(s));
      capYs.push(field.yOf(s));
      capColors.push(cv - 1);
      insertHole(cellSpiral[s]);
    }
    seen.add(posKey(hashA, hashB));

    const cx = field.xOf(chosenCell);
    const cy = field.yOf(chosenCell);
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
