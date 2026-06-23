import { spiralCoordAt } from "./spiral";
import { createPicker } from "./strategy";
import type { Piece, PlacedData, Placement, StrategyKind } from "./types";

const PROGRESS_INTERVAL = 4096;

// Encode a cell (x, y) as a single integer key. Comfortably covers ±8191, far
// beyond the spiral radius of a 1M-cell fill (~510), and stays < 2^31 so the
// Maps keep fast integer keys.
const CELL_OFFSET = 8192;
const CELL_STRIDE = 16384;
function cellNum(x: number, y: number): number {
  return (x + CELL_OFFSET) * CELL_STRIDE + (y + CELL_OFFSET);
}

export function computePlacements(
  pieces: Piece[],
  strategy: StrategyKind,
  maxPieces: number,
  onProgress?: (done: number) => void,
): Placement[] {
  if (pieces.length === 0 || maxPieces <= 0) return [];

  const picker = createPicker(strategy, pieces);
  const placements: Placement[] = [];
  const occupied = new Set<number>(); // cellNum
  const attackers = new Map<number, number>(); // cellNum -> bitmask of attacking color bits

  // Each distinct color gets a bit; "attacked by another color" is a single
  // bitmask test, so a cell carries one number instead of a nested map.
  const colorBit = new Map<string, number>();
  const bitOf = (color: string): number => {
    let b = colorBit.get(color);
    if (b === undefined) {
      b = colorBit.size;
      colorBit.set(color, b);
    }
    return b;
  };

  // Per-color scan pointer: the lowest spiral index that could still be valid
  // for that color. A cell only ever becomes occupied or attacked (never the
  // reverse), so a cell that is invalid for color C stays invalid — each
  // color's pointer only moves forward, giving ~O(n) total work instead of the
  // O(n^2) of re-walking the attacked-but-empty band on every placement.
  const pointerByColor = new Map<string, number>();

  for (let frame = 0; frame < maxPieces; frame++) {
    const piece = picker.next();
    const myBit = bitOf(piece.color);
    const others = ~(1 << myBit);

    let scan = pointerByColor.get(piece.color) ?? 0;
    // Find the lowest empty cell not attacked by a different color.
    while (true) {
      const coord = spiralCoordAt(scan);
      const key = cellNum(coord.x, coord.y);
      if (!occupied.has(key) && ((attackers.get(key) ?? 0) & others) === 0) {
        occupied.add(key);
        placements.push({
          frame,
          index: scan + 1,
          coord: { x: coord.x, y: coord.y },
          pieceId: piece.id,
          color: piece.color,
        });
        const bit = 1 << myBit;
        for (const [dx, dy] of piece.offsets) {
          const tk = cellNum(coord.x + dx, coord.y + dy);
          attackers.set(tk, (attackers.get(tk) ?? 0) | bit);
        }
        pointerByColor.set(piece.color, scan);
        break;
      }
      scan++;
    }

    if (onProgress && (frame + 1) % PROGRESS_INTERVAL === 0) onProgress(frame + 1);
  }

  onProgress?.(maxPieces);
  return placements;
}

/**
 * Pack a placement sequence into the columnar {@link PlacedData} form used by
 * the renderer (and transferred out of the worker). Preserves placement order.
 */
export function packPlacements(placements: Placement[]): PlacedData {
  const count = placements.length;
  const xs = new Int32Array(count);
  const ys = new Int32Array(count);
  const colorIndex = new Uint8Array(count);
  const colors: string[] = [];
  const colorMap = new Map<string, number>();
  for (let i = 0; i < count; i++) {
    const p = placements[i];
    xs[i] = p.coord.x;
    ys[i] = p.coord.y;
    let ci = colorMap.get(p.color);
    if (ci === undefined) {
      ci = colors.length;
      colorMap.set(p.color, ci);
      colors.push(p.color);
    }
    colorIndex[i] = ci;
  }
  return { xs, ys, colorIndex, colors, count };
}
