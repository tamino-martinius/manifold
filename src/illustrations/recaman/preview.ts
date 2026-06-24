import { type Camera, easeScale, fitBounds } from "./camera";
import { generateRecaman } from "./recaman";
import { renderRecaman } from "./renderer";

const PREVIEW_TERMS = 120;
// Floor the fitted span so the hover-reveal's first terms sit in a stable window
// (matches the studio camera) instead of rescaling hard while the range is tiny.
const MIN_SPAN = 20;

export function mountRecamanPreview(canvas: HTMLCanvasElement): () => void {
  const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
  const dpr = window.devicePixelRatio || 1;
  const cssSize = canvas.clientWidth || 280;
  canvas.width = Math.round(cssSize * dpr);
  canvas.height = Math.round(cssSize * dpr);

  const arcs = generateRecaman(PREVIEW_TERMS);
  const total = arcs.starts.length;
  const midFrame = Math.max(1, Math.floor(total * 0.55));
  let frame = midFrame;
  let displayScale = 0;
  let displayCx = 0;
  let rafId = 0;
  let last = 0;
  let hovering = false;

  const draw = (shownFrame: number, snap: boolean, dt: number): void => {
    const shown = Math.min(Math.ceil(shownFrame), total);
    let lineMax = 0;
    for (let i = 0; i <= shown; i++) {
      const v = arcs.values[i];
      if (v > lineMax) lineMax = v;
    }
    const fitMax = Math.max(lineMax, MIN_SPAN);
    const fitTallest = Math.max(shown / 2, MIN_SPAN / 2);
    const targetCx = fitMax / 2;
    const pad = Math.max(1, Math.max(fitMax, 2 * fitTallest) * 0.07);
    const target = fitBounds(0, fitMax, fitTallest, canvas.width, canvas.height, pad);
    displayScale = snap ? target.scale : easeScale(displayScale, target.scale, dt);
    displayCx = snap ? targetCx : easeScale(displayCx, targetCx, dt);
    const cam: Camera = {
      scale: displayScale,
      offsetX: canvas.width / 2 - displayCx * displayScale,
      offsetY: canvas.height / 2,
    };
    renderRecaman(ctx, cam, arcs, shown, "gradient", true, canvas.width, canvas.height);
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
    if (frame > total + 20) {
      frame = 0;
      displayScale = 0;
      displayCx = 0;
      last = 0;
    }
    draw(frame, false, dt);
    rafId = requestAnimationFrame(tick);
  };

  const card: Element = canvas.closest(".m-card") ?? canvas;
  const onEnter = (): void => {
    if (hovering) return;
    hovering = true;
    frame = 0; // play the reveal from the start while hovered
    displayScale = 0;
    displayCx = 0;
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
