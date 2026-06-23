import { el } from "../../../shared/dom";
import { gridRadius, offsetKey } from "../pieces";
import type { GridSize } from "../types";

export function toggleOffset(
  offsets: [number, number][],
  dx: number,
  dy: number,
): [number, number][] {
  const key = offsetKey(dx, dy);
  const exists = offsets.some(([x, y]) => offsetKey(x, y) === key);
  if (exists) return offsets.filter(([x, y]) => offsetKey(x, y) !== key);
  return [...offsets, [dx, dy]];
}

export function movementGrid(
  gridSize: GridSize,
  offsets: [number, number][],
  onToggle: (dx: number, dy: number) => void,
): HTMLElement {
  const active = new Set(offsets.map(([x, y]) => offsetKey(x, y)));
  const grid = el("div", { className: "cb-grid" });
  grid.style.gridTemplateColumns = `repeat(${gridSize}, 1fr)`;
  const r = gridRadius(gridSize);
  for (let dy = r; dy >= -r; dy--) {
    for (let dx = -r; dx <= r; dx++) {
      if (dx === 0 && dy === 0) {
        grid.append(el("button", { className: "center", disabled: true }));
        continue;
      }
      const on = active.has(offsetKey(dx, dy));
      grid.append(el("button", { className: on ? "on" : "", onClick: () => onToggle(dx, dy) }));
    }
  }
  return grid;
}

/** A small, read-only preview of a movement pattern (for the preset menu). */
export function miniGrid(gridSize: GridSize, offsets: [number, number][]): HTMLElement {
  const active = new Set(offsets.map(([x, y]) => offsetKey(x, y)));
  const grid = el("div", { className: "cb-mini-grid" });
  grid.style.gridTemplateColumns = `repeat(${gridSize}, 1fr)`;
  const r = gridRadius(gridSize);
  for (let dy = r; dy >= -r; dy--) {
    for (let dx = -r; dx <= r; dx++) {
      const cls = dx === 0 && dy === 0 ? "center" : active.has(offsetKey(dx, dy)) ? "on" : "";
      grid.append(el("span", { className: `cb-mini-cell${cls ? ` ${cls}` : ""}` }));
    }
  }
  return grid;
}
