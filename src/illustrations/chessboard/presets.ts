import type { GridSize } from "./types";

export type MovementPreset = {
  name: string;
  gridSize: GridSize;
  offsets: [number, number][];
};

/** Expand base offsets to full 8-fold (dihedral) symmetry, dropping the center. */
function sym(base: [number, number][]): [number, number][] {
  const seen = new Map<string, [number, number]>();
  for (const [x, y] of base) {
    const variants: [number, number][] = [
      [x, y],
      [-x, y],
      [x, -y],
      [-x, -y],
      [y, x],
      [-y, x],
      [y, -x],
      [-y, -x],
    ];
    for (const [a, b] of variants) {
      if (a === 0 && b === 0) continue;
      seen.set(`${a},${b}`, [a, b]);
    }
  }
  return [...seen.values()];
}

// A broad set of symmetric movement patterns (classic + fairy-chess leapers and
// some geometric shapes). All are 8-fold symmetric by construction.
export const MOVEMENT_PRESETS: MovementPreset[] = [
  { name: "Knight", gridSize: 5, offsets: sym([[1, 2]]) },
  {
    name: "King",
    gridSize: 3,
    offsets: sym([
      [1, 0],
      [1, 1],
    ]),
  },
  { name: "Wazir", gridSize: 3, offsets: sym([[1, 0]]) },
  { name: "Ferz", gridSize: 3, offsets: sym([[1, 1]]) },
  { name: "Dabbaba", gridSize: 5, offsets: sym([[2, 0]]) },
  { name: "Alfil", gridSize: 5, offsets: sym([[2, 2]]) },
  {
    name: "Knight+King",
    gridSize: 5,
    offsets: sym([
      [1, 0],
      [1, 1],
      [1, 2],
    ]),
  },
  {
    name: "Cross",
    gridSize: 5,
    offsets: sym([
      [1, 0],
      [2, 0],
    ]),
  },
  {
    name: "Saltire",
    gridSize: 5,
    offsets: sym([
      [1, 1],
      [2, 2],
    ]),
  },
  {
    name: "Ring",
    gridSize: 5,
    offsets: sym([
      [2, 0],
      [2, 1],
      [2, 2],
    ]),
  },
  {
    name: "Diamond",
    gridSize: 5,
    offsets: sym([
      [1, 0],
      [2, 0],
      [1, 1],
    ]),
  },
  { name: "Camel", gridSize: 7, offsets: sym([[1, 3]]) },
  { name: "Zebra", gridSize: 7, offsets: sym([[2, 3]]) },
  { name: "Giraffe", gridSize: 9, offsets: sym([[1, 4]]) },
];

/** Name of the preset matching these offsets+grid, or "Custom" if none. */
export function presetNameFor(gridSize: GridSize, offsets: [number, number][]): string {
  const key = (offs: [number, number][]): string =>
    offs
      .map(([x, y]) => `${x},${y}`)
      .sort()
      .join("|");
  const k = key(offsets);
  const match = MOVEMENT_PRESETS.find((p) => p.gridSize === gridSize && key(p.offsets) === k);
  return match ? match.name : "Custom";
}
