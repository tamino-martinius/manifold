// World -> screen camera for the coral. The coral is NOT origin-symmetric and its
// shape depends on the turn angles, so chessboard's origin-centered fit does not
// apply — we fit an arbitrary bounding box instead. Same `{scale, offsetX, offsetY}`
// shape and the same y-flip as chessboard's `worldToScreen`, and we reuse its
// frame-rate-independent `easeScale` so the view glides when the box jumps.
export { easeScale } from "../chessboard/camera";

export type Camera = { scale: number; offsetX: number; offsetY: number };

/** Pixels-per-world-unit that fits a bounding box into the canvas with padding. */
export function fitScale(
  minX: number,
  maxX: number,
  minY: number,
  maxY: number,
  canvasW: number,
  canvasH: number,
  padFrac = 0.06,
): number {
  const worldW = Math.max(maxX - minX, 1e-9);
  const worldH = Math.max(maxY - minY, 1e-9);
  const pad = 1 + 2 * padFrac;
  return Math.min(canvasW / (worldW * pad), canvasH / (worldH * pad));
}

/**
 * Fit an arbitrary bounding box, centering its midpoint on the canvas. `offsetX/Y`
 * fold in the center term (the box is not origin-centered), so easing the scale
 * requires recomputing the offsets from the eased scale + box center (see main.ts).
 */
export function fitBounds(
  minX: number,
  maxX: number,
  minY: number,
  maxY: number,
  canvasW: number,
  canvasH: number,
  padFrac = 0.06,
): Camera {
  const scale = fitScale(minX, maxX, minY, maxY, canvasW, canvasH, padFrac);
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  // Same y-flip as chessboard's worldToScreen: screen-y = -world-y*scale + offsetY.
  return { scale, offsetX: canvasW / 2 - cx * scale, offsetY: canvasH / 2 + cy * scale };
}
