// Aspect-correct, equal-scale linear camera for the Ford-circles number line.
//
// Unlike the origin-centered spiral camera (which fits x and y extents
// independently and would squash circles into ellipses), this camera uses a
// SINGLE shared scale on both axes. That is the whole point: the on-screen
// radius is `r * scale` in x AND y, so `ctx.arc` draws a true circle at any zoom.

export type Camera = { scale: number; offsetX: number; offsetY: number };

/**
 * Fit the interval [a, b] across the x-axis with circles rising to `yMax` above
 * y = 0, using one shared scale so Ford circles render perfectly round. The scale
 * is whichever fits the interval width AND the tallest circle; offsets pin world
 * `a` to the left edge (after padding) and y = 0 near the canvas bottom.
 */
export function fitInterval(
  a: number,
  b: number,
  yMax: number, // tallest visible circle's center.y == its radius (1/2 for integers)
  canvasW: number,
  canvasH: number,
  pad: number, // device-px breathing room
): Camera {
  const worldW = Math.max(b - a, 1e-9);
  const safeYMax = Math.max(yMax, 1e-9);
  // One scale for both axes — clamp so the tallest circle also fits vertically.
  const scale = Math.min((canvasW - 2 * pad) / worldW, (canvasH - 2 * pad) / safeYMax);
  return { scale, offsetX: pad - a * scale, offsetY: canvasH - pad };
}

/** World → screen, with screen-y flipped (up is up). */
export function worldToScreen(cam: Camera, x: number, y: number): { sx: number; sy: number } {
  return { sx: x * cam.scale + cam.offsetX, sy: -y * cam.scale + cam.offsetY };
}

/** Screen → world (inverse of worldToScreen) — handy for zoom-to-cursor. */
export function screenToWorld(cam: Camera, sx: number, sy: number): { wx: number; wy: number } {
  return { wx: (sx - cam.offsetX) / cam.scale, wy: (cam.offsetY - sy) / cam.scale };
}

// Frame-rate-independent exponential easing of the camera scale — shared with the
// chessboard so zoom feel is identical across the atlas.
export { easeScale } from "../chessboard/camera";
