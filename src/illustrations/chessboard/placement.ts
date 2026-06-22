import { spiralCoords } from "./spiral";
import { createPicker } from "./strategy";
import type { Piece, Placement, StrategyKind } from "./types";

function cellKey(x: number, y: number): string {
  return `${x},${y}`;
}

export function computePlacements(
  pieces: Piece[],
  strategy: StrategyKind,
  maxPieces: number,
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

  let lowestEmpty = 0; // index into coords of the lowest cell never yet occupied

  for (let frame = 0; frame < maxPieces; frame++) {
    const piece = picker.next();

    // Advance lowestEmpty past occupied cells.
    while (
      lowestEmpty < coords.length &&
      occupied.has(cellKey(coords[lowestEmpty].x, coords[lowestEmpty].y))
    ) {
      lowestEmpty++;
    }

    let scan = lowestEmpty;
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
        break;
      }
      scan++;
    }
  }

  return placements;
}
