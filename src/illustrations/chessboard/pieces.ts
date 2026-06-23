import type { GridSize, Piece } from "./types";

export function gridRadius(gridSize: GridSize): number {
  return (gridSize - 1) / 2;
}

export function offsetKey(dx: number, dy: number): string {
  return `${dx},${dy}`;
}

export function knightOffsets(): [number, number][] {
  return [
    [1, 2],
    [2, 1],
    [2, -1],
    [1, -2],
    [-1, -2],
    [-2, -1],
    [-2, 1],
    [-1, 2],
  ];
}

export function gridCells(gridSize: GridSize): [number, number][] {
  const r = gridRadius(gridSize);
  const cells: [number, number][] = [];
  for (let dy = r; dy >= -r; dy--) {
    for (let dx = -r; dx <= r; dx++) {
      if (dx === 0 && dy === 0) continue;
      cells.push([dx, dy]);
    }
  }
  return cells;
}

export function clampOffsets(offsets: [number, number][], gridSize: GridSize): [number, number][] {
  const r = gridRadius(gridSize);
  return offsets.filter(([dx, dy]) => Math.abs(dx) <= r && Math.abs(dy) <= r);
}

export function defaultPieces(): Piece[] {
  return [
    { id: "p1", color: "#000000", gridSize: 5, offsets: knightOffsets(), weight: 1 },
    { id: "p2", color: "#e10600", gridSize: 5, offsets: knightOffsets(), weight: 1 },
  ];
}
