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
  const pad = paddingCells + 0.5;
  const worldHalfW = halfX + pad;
  const worldHalfH = halfY + pad;
  const scale = Math.min(canvasW / (2 * worldHalfW), canvasH / (2 * worldHalfH));
  // screen center = canvas center; offset is independent of scale, so easing the
  // scale never moves the origin. Screen y is flipped (world +y is up).
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
