// Camera for a horizontal number line that grows rightward (not origin-centered,
// so chessboard's `fitFromExtent` does not apply). Shares the {scale, offsetX,
// offsetY} shape and the y-flip convention of chessboard's `worldToScreen`, so
// `easeScale` can ease `scale` smoothly as the range expands.
export { easeScale } from "../chessboard/camera";

export type Camera = { scale: number; offsetX: number; offsetY: number };

/**
 * Fit a horizontal number line spanning [minX, maxX] (y=0) with arcs rising at
 * most `maxRadius` above/below it. Centers the x-range on the canvas and fits the
 * tallest arc vertically.
 */
export function fitBounds(
  minX: number,
  maxX: number,
  maxRadius: number,
  canvasW: number,
  canvasH: number,
  padding: number, // world units of breathing room
): Camera {
  const worldW = Math.max(1e-6, maxX - minX + 2 * padding);
  const worldH = Math.max(1e-6, 2 * maxRadius + 2 * padding); // arcs go ±maxRadius about y=0
  const scale = Math.min(canvasW / worldW, canvasH / worldH);
  const cx = (minX + maxX) / 2; // world center x
  // Pin world center-x to canvas center-x; world y=0 to canvas center-y.
  const offsetX = canvasW / 2 - cx * scale;
  const offsetY = canvasH / 2;
  return { scale, offsetX, offsetY };
}

export function worldToScreen(cam: Camera, x: number, y: number): { sx: number; sy: number } {
  return { sx: x * cam.scale + cam.offsetX, sy: -y * cam.scale + cam.offsetY };
}
