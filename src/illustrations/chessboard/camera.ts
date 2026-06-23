import type { Coord } from "./types";

export type Camera = { scale: number; offsetX: number; offsetY: number };

export function fitCamera(
  coords: Coord[],
  canvasW: number,
  canvasH: number,
  paddingCells: number,
): Camera {
  // Keep the origin (0,0) — the cell numbered 1 — fixed at the canvas center.
  // Fit the largest extent reached from the origin in each axis, so all placed
  // cells stay visible while cell 1 never drifts. Each cell spans 1 world unit
  // centered on its coord, so its outer edge is |coord| + 0.5; add padding cells.
  let halfX = 0;
  let halfY = 0;
  for (const c of coords) {
    const ax = Math.abs(c.x);
    const ay = Math.abs(c.y);
    if (ax > halfX) halfX = ax;
    if (ay > halfY) halfY = ay;
  }
  return fitFromExtent(halfX, halfY, canvasW, canvasH, paddingCells);
}

/**
 * Origin-centered fit from a pre-computed half-extent (max |x|, max |y| of the
 * shown cells). Lets callers track the extent incrementally instead of
 * rebuilding a coordinate array each frame. `offsetX/Y` are scale-independent,
 * so easing the scale never moves cell 1 off the canvas center.
 */
export function fitFromExtent(
  halfX: number,
  halfY: number,
  canvasW: number,
  canvasH: number,
  paddingCells: number,
): Camera {
  const pad = paddingCells + 0.5;
  const worldHalfW = halfX + pad;
  const worldHalfH = halfY + pad;
  const scale = Math.min(canvasW / (2 * worldHalfW), canvasH / (2 * worldHalfH));
  return { scale, offsetX: canvasW / 2, offsetY: canvasH / 2 };
}

export function worldToScreen(cam: Camera, x: number, y: number): { sx: number; sy: number } {
  return { sx: x * cam.scale + cam.offsetX, sy: -y * cam.scale + cam.offsetY };
}

/**
 * Frame-rate-independent exponential easing of the camera scale toward a target.
 * `current <= 0` is the snap sentinel (first frame / animation reset): it returns
 * the target immediately so the view never zooms in from nothing. `dt` is clamped
 * so a long stall (e.g. a backgrounded tab) cannot produce a giant jump.
 */
export function easeScale(current: number, target: number, dt: number, rate = 8): number {
  if (current <= 0) return target;
  const k = 1 - Math.exp(-rate * Math.min(Math.max(dt, 0), 0.1));
  return current + (target - current) * k;
}
