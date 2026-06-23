// The Hilbert figure fills a positive-quadrant box [0, 2^k)², so chessboard's
// origin-centered fitFromExtent does not fit it. We add a square `fitBounds`
// here and reuse the shared scale-easing + world→screen transform (same y-flip).
export { type Camera, easeScale, worldToScreen } from "../chessboard/camera";
import type { Camera } from "../chessboard/camera";

/**
 * Square fit: center a grid box with one shared scale for both axes (no aspect
 * stretch), keeping the chessboard `{ scale, offsetX, offsetY }` shape and the
 * y-flip convention (`worldToScreen`: `sy = -y*scale + offsetY`). Cells span
 * their full unit, so the box's outer edges are `minX..maxX+1` / `minY..maxY+1`.
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
  const pad = paddingCells;
  const worldW = maxX - minX + 1 + 2 * pad; // +1: cells span their full unit
  const worldH = maxY - minY + 1 + 2 * pad;
  const scale = Math.min(canvasW / worldW, canvasH / worldH); // shared → square
  const cx = (minX + maxX + 1) / 2; // world center of the box
  const cy = (minY + maxY + 1) / 2;
  return { scale, offsetX: canvasW / 2 - cx * scale, offsetY: canvasH / 2 + cy * scale };
}

// --- Auto-zoom anchored at the path's start ---------------------------------
// The studio camera zooms to fit only the *revealed* part of the path (zoom out
// as it draws), with the path's bottom-left start point pinned to a static
// screen position. Mirrors the chessboard's incremental fit, but anchored at a
// corner instead of the centre.

// Fixed screen anchor for the start point: lower-left, with breathing room.
const ANCHOR_X_FRAC = 0.14;
const ANCHOR_Y_FRAC = 0.86;
const FAR_MARGIN_FRAC = 0.06; // gap kept on the far (top-right) edges
const FIT_PAD_CELLS = 1; // breathing room beyond the revealed box
const MIN_CELLS = 3; // never zoom in tighter than this (no single giant cell)
const START_PT = 0.5; // world coord of the start point (cell centre of (0,0))

function anchorOf(canvasW: number, canvasH: number): { ax: number; ay: number } {
  return { ax: canvasW * ANCHOR_X_FRAC, ay: canvasH * ANCHOR_Y_FRAC };
}

/**
 * Target scale that fits the revealed box `[0, maxX] × [0, maxY]` (cells) up and
 * to the right of the fixed bottom-left anchor, with padding. Shrinks as the
 * revealed extent grows, so the view zooms out while the path draws.
 */
export function fitAnchoredScale(
  maxX: number,
  maxY: number,
  canvasW: number,
  canvasH: number,
): number {
  const { ax, ay } = anchorOf(canvasW, canvasH);
  const margin = Math.min(canvasW, canvasH) * FAR_MARGIN_FRAC;
  const eX = Math.max(maxX, MIN_CELLS);
  const eY = Math.max(maxY, MIN_CELLS);
  // World distance from the start point to the far cell edge, plus padding.
  const worldRight = eX + 1 - START_PT + FIT_PAD_CELLS;
  const worldUp = eY + 1 - START_PT + FIT_PAD_CELLS;
  const scaleRight = (canvasW - ax - margin) / worldRight;
  const scaleUp = (ay - margin) / worldUp;
  return Math.min(scaleRight, scaleUp);
}

/**
 * Build the camera at a given (eased) scale, pinning the path start point
 * `(0.5, 0.5)` to the fixed screen anchor. Offsets depend on scale, so they are
 * recomputed each frame — that keeps the start point exactly static while the
 * zoom eases.
 */
export function anchoredCamera(scale: number, canvasW: number, canvasH: number): Camera {
  const { ax, ay } = anchorOf(canvasW, canvasH);
  return { scale, offsetX: ax - START_PT * scale, offsetY: ay + START_PT * scale };
}
