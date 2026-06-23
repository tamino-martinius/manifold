// Camera for the dragon curve. Unlike the chessboard (origin-centered, so its
// offsets are scale-independent), the dragon is NOT origin-symmetric — its
// bounds shift with order and fold angle — so we fit an arbitrary bounding box
// and re-derive the offsets from the (possibly eased) scale each frame.

// The scale easing is identical to the chessboard's; re-export it so callers
// import a single camera module.
export { easeScale } from "../chessboard/camera";

export type Camera = { scale: number; offsetX: number; offsetY: number };

/** Centroid + rotation-stable circumradii of a (prefix of a) polyline. */
export type Framing = {
  cx: number;
  cy: number;
  /** Max distance from the centroid — frames a single copy, centred. */
  rSingle: number;
  /** Max distance from the origin — frames the origin-symmetric 4-copy tiling. */
  rTiling: number;
};

/**
 * Frame the first `segCount` segments (segCount + 1 points) of a packed
 * `[x0,y0, x1,y1, …]` polyline. The dragon scales by √2 and rotates 45° each
 * iteration, so its axis-aligned bounding box oscillates — fitting the
 * circumradius (max distance from the centre) instead gives a scale that grows
 * monotonically, so the zoom transitions smoothly. The iteration animation
 * reveals a growing prefix, so framing a prefix lets the camera track it
 * continuously rather than snapping per integer order.
 */
export function framePrefix(points: Float64Array, segCount: number): Framing {
  const n = Math.max(1, segCount) + 1; // point count
  let sx = 0;
  let sy = 0;
  for (let i = 0; i < n; i++) {
    sx += points[2 * i];
    sy += points[2 * i + 1];
  }
  const cx = sx / n;
  const cy = sy / n;
  let r2single = 0;
  let r2origin = 0;
  for (let i = 0; i < n; i++) {
    const x = points[2 * i];
    const y = points[2 * i + 1];
    const ds = (x - cx) ** 2 + (y - cy) ** 2;
    if (ds > r2single) r2single = ds;
    const dorg = x * x + y * y;
    if (dorg > r2origin) r2origin = dorg;
  }
  return { cx, cy, rSingle: Math.sqrt(r2single), rTiling: Math.sqrt(r2origin) };
}

/**
 * Fit a bounding box to the canvas with a uniform (square-aspect) scale, the
 * box centered, and the screen-y axis flipped. `padding` is in world units.
 */
export function fitBounds(
  minX: number,
  maxX: number,
  minY: number,
  maxY: number,
  canvasW: number,
  canvasH: number,
  padding: number,
): Camera {
  const worldW = maxX - minX + 2 * padding;
  const worldH = maxY - minY + 2 * padding;
  // Guard against a degenerate (zero-extent) box so scale stays finite.
  const scale = Math.min(canvasW / Math.max(worldW, 1e-9), canvasH / Math.max(worldH, 1e-9));
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const offsetX = canvasW / 2 - cx * scale;
  const offsetY = canvasH / 2 + cy * scale; // + because worldToScreen flips y
  return { scale, offsetX, offsetY };
}

export function worldToScreen(cam: Camera, x: number, y: number): { sx: number; sy: number } {
  return { sx: x * cam.scale + cam.offsetX, sy: -y * cam.scale + cam.offsetY };
}

export type Bounds = { minX: number; maxX: number; minY: number; maxY: number };

/**
 * Bounds of the union of four copies of a box rotated 0/90/180/270° about the
 * origin (the dragon's start vertex) — used to frame the 4-copy plane tiling.
 */
export function tilingBounds(minX: number, maxX: number, minY: number, maxY: number): Bounds {
  // Rotations about the origin: 90°(x,y)→(−y,x), 180°→(−x,−y), 270°→(y,−x).
  // Each rotation of an axis-aligned box is again axis-aligned, so we union the
  // four resulting boxes.
  const xs = [minX, maxX, -maxY, -minY, -maxX, -minX, minY, maxY];
  const ys = [minY, maxY, minX, maxX, -maxY, -minY, -maxX, -minX];
  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minY: Math.min(...ys),
    maxY: Math.max(...ys),
  };
}
