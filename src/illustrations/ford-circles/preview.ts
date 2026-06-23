import type { Camera } from "./camera";
import { fitInterval } from "./camera";
import { fordCircles } from "./farey";
import { renderFord } from "./renderer";
import { DEFAULT_COLOR_MODE, DEFAULT_FILL_MODE, DEFAULT_ORDER } from "./state";

// Gallery preview: the classic [0,1] Ford diagram, using the studio's defaults
// (depth coloring, order 100). Static (fully revealed) at rest; replays the
// reveal while the card is hovered.
const ORDER = DEFAULT_ORDER;

export function mountFordCirclesPreview(canvas: HTMLCanvasElement): () => void {
  const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
  const dpr = window.devicePixelRatio || 1;
  const cssSize = canvas.clientWidth || 280;
  canvas.width = Math.round(cssSize * dpr);
  canvas.height = Math.round(cssSize * dpr);

  const circles = fordCircles(ORDER, 0, 1);
  const pad = Math.round(14 * dpr);
  const maxR = circles.length > 0 ? circles[0].r : 0.5;
  const fit = fitInterval(0, 1, 2 * maxR, canvas.width, canvas.height, pad);
  const usedW = fit.scale; // interval width is 1
  const cam: Camera = {
    scale: fit.scale,
    offsetX: Math.max(pad, (canvas.width - usedW) / 2),
    offsetY: canvas.height - pad,
  };

  let frame = ORDER;
  let rafId = 0;
  let last = 0;
  let hovering = false;

  const draw = (nEff: number): void =>
    renderFord(
      ctx,
      cam,
      circles,
      nEff,
      DEFAULT_COLOR_MODE,
      DEFAULT_FILL_MODE,
      canvas.width,
      canvas.height,
    );
  const renderStatic = (): void => {
    frame = ORDER;
    draw(frame);
  };

  const tick = (now: number): void => {
    if (!hovering) return;
    const dt = last === 0 ? 0 : (now - last) / 1000;
    last = now;
    frame += (ORDER / 3.5) * dt; // full reveal in ~3.5s regardless of order
    if (frame > ORDER + ORDER * 0.05) {
      frame = 0;
      last = 0;
    }
    draw(Math.min(frame, ORDER));
    rafId = requestAnimationFrame(tick);
  };

  const card: Element = canvas.closest(".m-card") ?? canvas;
  const onEnter = (): void => {
    if (hovering) return;
    hovering = true;
    frame = 0; // replay the reveal from the start
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
