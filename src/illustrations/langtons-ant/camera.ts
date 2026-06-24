// Camera for Langton's Ant. Reuses the chessboard's easing + world→screen
// (same y-flip convention), but fits an *arbitrary* bounding box rather than an
// origin-symmetric extent — the painted region is not centered on the origin.
import { type Camera, easeScale, worldToScreen } from "../chessboard/camera";

export { type Camera, easeScale, worldToScreen };

/**
 * Fit the painted cell box [minX..maxX] × [minY..maxY] (inclusive cell coords)
 * into the canvas with `paddingCells` of margin, keeping equal x/y scale so
 * cells stay square. The box center is pinned to the canvas center; `offsetX/Y`
 * are therefore scale-dependent, so recompute them from the (eased) scale each
 * frame to keep the center fixed while zooming.
 */
export function fitBounds(
  minX: number,
  maxX: number,
  minY: number,
  maxY: number,
  canvasW: number,
  canvasH: number,
  paddingCells: number,
): Camera {
  const worldW = maxX - minX + 1 + 2 * paddingCells;
  const worldH = maxY - minY + 1 + 2 * paddingCells;
  const scale = Math.min(canvasW / worldW, canvasH / worldH);
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  return { scale, offsetX: canvasW / 2 - cx * scale, offsetY: canvasH / 2 + cy * scale };
}

/**
 * Center the ant at a fixed zoom: `cellsPerScreen` cells fit across the smaller
 * viewport dimension. Used by the "Follow ant" camera mode to ride the highway.
 */
export function followAnt(
  antX: number,
  antY: number,
  cellsPerScreen: number,
  canvasW: number,
  canvasH: number,
): Camera {
  const scale = Math.min(canvasW, canvasH) / cellsPerScreen;
  return {
    scale,
    offsetX: canvasW / 2 - antX * scale,
    offsetY: canvasH / 2 + antY * scale,
  };
}
