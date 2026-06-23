import { spiralCoords } from "./spiral";
import { createPicker } from "./strategy";
import type { Piece, PlacedData, Placement, StrategyKind } from "./types";

const PROGRESS_INTERVAL = 4096;

function cellKey(x: number, y: number): string {
  return `${x},${y}`;
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
  const occupied = new Map<string, string>(); // cellKey -> color
  const attackers = new Map<string, Map<string, number>>(); // cellKey -> color -> count

  // Grow the spiral coordinate cache as needed.
  let coords = spiralCoords(Math.max(maxPieces * 8, 64));

  const attackedByOther = (key: string, color: string): boolean => {
    const colors = attackers.get(key);
    if (!colors) return false;
    for (const [c, count] of colors) {
      if (c !== color && count > 0) return true;
    }
    return false;
  };

  // Per-color scan pointer: the lowest spiral index that could still be valid
  // for that color. A cell only ever becomes occupied or attacked (never the
  // reverse), so a cell that is invalid for color C stays invalid — each
  // color's pointer only moves forward, giving ~O(n) total work instead of the
  // O(n^2) of re-walking the attacked-but-empty band on every placement.
  const pointerByColor = new Map<string, number>();

  for (let frame = 0; frame < maxPieces; frame++) {
    const piece = picker.next();

    let scan = pointerByColor.get(piece.color) ?? 0;
    // Find the lowest empty cell not attacked by a different color.
    // Loop is bounded: spiral grows on demand and always breaks on placement.
    while (true) {
      if (scan >= coords.length) {
        coords = spiralCoords(coords.length * 2);
      }
      const coord = coords[scan];
      const key = cellKey(coord.x, coord.y);
      if (!occupied.has(key) && !attackedByOther(key, piece.color)) {
        occupied.set(key, piece.color);
        placements.push({
          frame,
          index: scan + 1,
          coord: { x: coord.x, y: coord.y },
          pieceId: piece.id,
          color: piece.color,
        });
        for (const [dx, dy] of piece.offsets) {
          const tk = cellKey(coord.x + dx, coord.y + dy);
          const colors = attackers.get(tk) ?? new Map<string, number>();
          colors.set(piece.color, (colors.get(piece.color) ?? 0) + 1);
          attackers.set(tk, colors);
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
