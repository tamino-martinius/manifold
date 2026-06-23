import { easeScale, fitFromExtent } from "./camera";
import { defaultPieces } from "./pieces";
import { computePlacements, packPlacements } from "./placement";
import { renderBoard } from "./renderer";

export function mountChessboardPreview(canvas: HTMLCanvasElement): () => void {
  const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
  const dpr = window.devicePixelRatio || 1;
  const cssSize = canvas.clientWidth || 280;
  canvas.width = Math.round(cssSize * dpr);
  canvas.height = Math.round(cssSize * dpr);

  const placed = packPlacements(computePlacements(defaultPieces(), "round-robin", 240));
  const midFrame = Math.max(1, Math.floor(placed.count * 0.55));
  let frame = midFrame;
  let displayScale = 0;
  let rafId = 0;
  let last = 0;
  let hovering = false;

  const draw = (shownFrame: number, snap: boolean, dt: number): void => {
    const shown = Math.min(Math.ceil(shownFrame), placed.count);
    let hx = 0;
    let hy = 0;
    for (let i = 0; i < shown; i++) {
      const ax = Math.abs(placed.xs[i]);
      const ay = Math.abs(placed.ys[i]);
      if (ax > hx) hx = ax;
      if (ay > hy) hy = ay;
    }
    const target = fitFromExtent(hx, hy, canvas.width, canvas.height, 3);
    displayScale = snap ? target.scale : easeScale(displayScale, target.scale, dt);
    renderBoard(
      ctx,
      { scale: displayScale, offsetX: target.offsetX, offsetY: target.offsetY },
      placed,
      shown,
      canvas.width,
      canvas.height,
    );
  };

  const renderStatic = (): void => {
    frame = midFrame;
    displayScale = 0;
    draw(frame, true, 0);
  };

  const tick = (now: number): void => {
    if (!hovering) return;
    const dt = last === 0 ? 0 : (now - last) / 1000;
    last = now;
    frame += 60 * dt;
    if (frame > placed.count + 30) {
      frame = 0;
      displayScale = 0;
      last = 0;
    }
    draw(frame, false, dt);
    rafId = requestAnimationFrame(tick);
  };

  const card: Element = canvas.closest(".m-card") ?? canvas;
  const onEnter = (): void => {
    if (hovering) return;
    hovering = true;
    frame = 0; // play the fill from the start while hovered
    displayScale = 0;
    last = 0;
    rafId = requestAnimationFrame(tick);
  };
  const onLeave = (): void => {
    hovering = false;
    cancelAnimationFrame(rafId);
    renderStatic();
  };
  card.addEventListener("mouseenter", onEnter);
  card.addEventListener("mouseleave", onLeave);

  renderStatic();
  return () => {
    cancelAnimationFrame(rafId);
    card.removeEventListener("mouseenter", onEnter);
    card.removeEventListener("mouseleave", onLeave);
  };
}
