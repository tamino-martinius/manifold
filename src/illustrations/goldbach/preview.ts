import { goldbachCounts } from "./goldbach";
import { renderComet } from "./renderer";

// Small comet for the gallery card: cheap to compute, recognisable shape, and
// coloured by band so the sub-bands read at a glance.
const PREVIEW_N = 2200;
const COLOR_BY = "mod6" as const;
const POINT_SIZE = 1.2;
const POINT_ALPHA = 0.5;

export function mountGoldbachPreview(canvas: HTMLCanvasElement): () => void {
  const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
  const dpr = window.devicePixelRatio || 1;
  const cssW = canvas.clientWidth || 280;
  const cssH = canvas.clientHeight || cssW;
  canvas.width = Math.round(cssW * dpr);
  canvas.height = Math.round(cssH * dpr);

  const data = goldbachCounts(PREVIEW_N);
  const count = data.E.length;
  const midFrame = Math.max(1, Math.floor(count * 0.62));

  let frame = midFrame;
  let rafId = 0;
  let last = 0;
  let hovering = false;

  const draw = (reveal: number): void => {
    const shown = Math.min(Math.max(0, Math.floor(reveal)), count);
    // Fit the axes to the revealed prefix so the comet zooms as it grows.
    let maxG = 1;
    for (let i = 0; i < shown; i++) if (data.g[i] > maxG) maxG = data.g[i];
    renderComet(
      ctx,
      data,
      {
        revealCount: shown,
        colorBy: COLOR_BY,
        pointSize: POINT_SIZE,
        pointAlpha: POINT_ALPHA,
        dpr,
        fitN: shown > 0 ? data.E[shown - 1] : 1,
        fitMaxG: maxG * 1.08,
      },
      canvas.width,
      canvas.height,
    );
  };

  const renderStatic = (): void => {
    frame = midFrame;
    draw(frame);
  };

  const tick = (now: number): void => {
    if (!hovering) return;
    const dt = last === 0 ? 0 : (now - last) / 1000;
    last = now;
    // Accelerating reveal so the sparse early comet isn't skipped instantly.
    frame += (40 + frame * 1.4) * Math.min(dt, 0.1);
    if (frame > count + count * 0.15) {
      frame = 0;
      last = 0;
    }
    draw(Math.min(Math.floor(frame), count));
    rafId = requestAnimationFrame(tick);
  };

  const card: Element = canvas.closest(".m-card") ?? canvas;
  const onEnter = (): void => {
    if (hovering) return;
    hovering = true;
    frame = 0;
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
