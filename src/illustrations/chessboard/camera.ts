import type { Coord } from "./types";

export type Camera = { scale: number; offsetX: number; offsetY: number };

export function fitCamera(
  coords: Coord[],
  canvasW: number,
  canvasH: number,
  paddingCells: number,
): Camera {
  let minX = 0;
  let maxX = 0;
  let minY = 0;
  let maxY = 0;
  if (coords.length > 0) {
    minX = Number.POSITIVE_INFINITY;
    maxX = Number.NEGATIVE_INFINITY;
    minY = Number.POSITIVE_INFINITY;
    maxY = Number.NEGATIVE_INFINITY;
    for (const c of coords) {
      if (c.x < minX) minX = c.x;
      if (c.x > maxX) maxX = c.x;
      if (c.y < minY) minY = c.y;
      if (c.y > maxY) maxY = c.y;
    }
  }
  // Each cell occupies 1 world unit centered on its integer coord, so the drawn
  // extent runs from min-0.5 to max+0.5, plus padding cells on each side.
  const padPlusHalf = paddingCells + 0.5;
  const worldMinX = minX - padPlusHalf;
  const worldMaxX = maxX + padPlusHalf;
  const worldMinY = minY - padPlusHalf;
  const worldMaxY = maxY + padPlusHalf;
  const worldW = worldMaxX - worldMinX;
  const worldH = worldMaxY - worldMinY;
  const scale = Math.min(canvasW / worldW, canvasH / worldH);
  const centerX = (worldMinX + worldMaxX) / 2;
  const centerY = (worldMinY + worldMaxY) / 2;
  // screen center = canvas center; screen y flipped (world +y is up).
  const offsetX = canvasW / 2 - centerX * scale;
  const offsetY = canvasH / 2 + centerY * scale;
  return { scale, offsetX, offsetY };
}

export function worldToScreen(cam: Camera, x: number, y: number): { sx: number; sy: number } {
  return { sx: x * cam.scale + cam.offsetX, sy: -y * cam.scale + cam.offsetY };
}
