// Camera for the Pascal triangle. Unlike the chessboard (origin-symmetric, pins
// (0,0) at the canvas center), this figure is NOT origin-symmetric: it grows
// DOWN and widens. So worldToScreen here DIVERGES from the shared convention —
// larger world y means LOWER on screen (sy = y*scale + offsetY, no negation),
// because the triangle grows downward. easeScale is reused unchanged.

export { easeScale } from "../chessboard/camera";

export type Camera = { scale: number; offsetX: number; offsetY: number };

/**
 * Fit the revealed Pascal triangle. With the (i,j) → (x = j − i/2, y = i)
 * convention the apex is at x = 0; revealing R rows occupies
 *   x ∈ [−R/2, +R/2],  y ∈ [0, R].
 * Centers the apex column (x = 0) on the canvas X and pins the apex `padding`
 * world-units below the top edge, fitting the wider of the two extents. Same
 * {scale, offsetX, offsetY} shape and y convention as worldToScreen, so easeScale
 * can ease `scale` as rows reveal (recompute offsetY from the eased scale each
 * frame to keep the apex pinned).
 */
export function fitBounds(
  rows: number, // revealed rows R (>= 1)
  canvasW: number,
  canvasH: number,
  padding: number, // world units of breathing room
): Camera {
  const R = Math.max(1, rows);
  const halfW = R / 2 + padding; // widest row half-width
  const worldH = R + 2 * padding; // y from 0 (apex) to R
  const scale = Math.min(canvasW / (2 * halfW), canvasH / worldH);
  // Apex column x = 0 → canvas center-x (scale-independent). Apex y = 0 sits
  // `padding` world-units below the top; deeper rows (larger y) draw downward.
  return { scale, offsetX: canvasW / 2, offsetY: padding * scale };
}

export function worldToScreen(cam: Camera, x: number, y: number): { sx: number; sy: number } {
  // y grows DOWNWARD for this figure: larger world y → larger screen y.
  return { sx: x * cam.scale + cam.offsetX, sy: y * cam.scale + cam.offsetY };
}
