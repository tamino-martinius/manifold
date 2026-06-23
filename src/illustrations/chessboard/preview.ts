import { easeScale, fitFromExtent } from "./camera";
import { defaultPieces } from "./pieces";
import { computePlacements, packPlacements } from "./placement";
import { renderBoard } from "./renderer";

export function mountChessboardPreview(canvas: HTMLCanvasElement): () => void {
  const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
  const dpr = window.devicePixelRatio || 1;
  // Square buffer sized to the (square) figure it's displayed in, for crispness.
  const cssSize = canvas.clientWidth || 280;
  canvas.width = Math.round(cssSize * dpr);
  canvas.height = Math.round(cssSize * dpr);

  const placed = packPlacements(computePlacements(defaultPieces(), "round-robin", 240));
  let frame = 0;
  let displayScale = 0;
  let rafId = 0;
  let last = 0;

  const tick = (now: number) => {
    const dt = last === 0 ? 0 : (now - last) / 1000;
    last = now;
    frame += 60 * dt;
    if (frame > placed.count + 40) {
      frame = 0;
      displayScale = 0; // snap on loop reset — no rewind-zoom
      last = 0;
    }
    const shown = Math.min(Math.ceil(frame), placed.count);
    let halfX = 0;
    let halfY = 0;
    for (let i = 0; i < shown; i++) {
      const ax = Math.abs(placed.xs[i]);
      const ay = Math.abs(placed.ys[i]);
      if (ax > halfX) halfX = ax;
      if (ay > halfY) halfY = ay;
    }
    const target = fitFromExtent(halfX, halfY, canvas.width, canvas.height, 3);
    displayScale = easeScale(displayScale, target.scale, dt);
    renderBoard(
      ctx,
      { scale: displayScale, offsetX: target.offsetX, offsetY: target.offsetY },
      placed,
      shown,
      canvas.width,
      canvas.height,
    );
    rafId = requestAnimationFrame(tick);
  };
  rafId = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(rafId);
}
