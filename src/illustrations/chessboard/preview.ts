import { fitCamera } from "./camera";
import { defaultPieces } from "./pieces";
import { computePlacements } from "./placement";
import { renderBoard } from "./renderer";

export function mountChessboardPreview(canvas: HTMLCanvasElement): () => void {
  const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
  const dpr = window.devicePixelRatio || 1;
  const size = 220;
  canvas.width = size * dpr;
  canvas.height = size * dpr;

  const placements = computePlacements(defaultPieces(), "round-robin", 240);
  let frame = 0;
  let rafId = 0;
  let last = 0;

  const tick = (now: number) => {
    const dt = last === 0 ? 0 : (now - last) / 1000;
    last = now;
    frame += 60 * dt;
    if (frame > placements.length + 40) {
      frame = 0;
      last = 0;
    }
    const shown = Math.min(Math.ceil(frame), placements.length);
    const cam = fitCamera(
      placements.slice(0, shown).map((p) => p.coord),
      canvas.width,
      canvas.height,
      3,
    );
    renderBoard(ctx, cam, placements, shown, canvas.width, canvas.height);
    rafId = requestAnimationFrame(tick);
  };
  rafId = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(rafId);
}
