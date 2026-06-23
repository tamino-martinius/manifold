import { fitBounds } from "./camera";
import { hilbertPath } from "./hilbert";
import { renderCurve } from "./renderer";

// A light order for the gallery grid (many previews run at once). 4^5 = 1024
// points — a recognisable fractal weave that stays cheap.
const PREVIEW_ORDER = 5;
const PAD_FRACTION = 0.06;

export function mountHilbertPreview(canvas: HTMLCanvasElement): () => void {
  const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
  const dpr = window.devicePixelRatio || 1;
  const cssSize = canvas.clientWidth || 280;
  canvas.width = Math.round(cssSize * dpr);
  canvas.height = Math.round(cssSize * dpr);

  const path = hilbertPath(PREVIEW_ORDER);
  const side = 1 << PREVIEW_ORDER;
  // Order is fixed in the preview, so the fit (and camera) never change.
  const target = fitBounds(
    0,
    side - 1,
    0,
    side - 1,
    canvas.width,
    canvas.height,
    side * PAD_FRACTION,
  );
  const c = side / 2;
  const cam = {
    scale: target.scale,
    offsetX: canvas.width / 2 - c * target.scale,
    offsetY: canvas.height / 2 + c * target.scale,
  };
  const midFrame = Math.max(1, Math.floor(path.n * 0.55));

  let frame = midFrame;
  let rafId = 0;
  let last = 0;
  let hovering = false;

  const draw = (f: number): void =>
    renderCurve(ctx, cam, path, f, "gradient", canvas.width, canvas.height);
  const renderStatic = (): void => {
    frame = midFrame;
    draw(frame);
  };

  const tick = (now: number): void => {
    if (!hovering) return;
    const dt = last === 0 ? 0 : (now - last) / 1000;
    last = now;
    frame += (40 + frame) * Math.min(dt, 0.1); // accelerating reveal
    if (frame > path.n + 20) {
      frame = 0;
      last = 0;
    }
    draw(frame);
    rafId = requestAnimationFrame(tick);
  };

  const card: Element = canvas.closest(".m-card") ?? canvas;
  const onEnter = (): void => {
    if (hovering) return;
    hovering = true;
    frame = 0; // draw the curve from the start while hovered
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
