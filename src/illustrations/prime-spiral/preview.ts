import { easeScale, fitFromExtent } from "../chessboard/camera";
import { buildSpiralData } from "./compute";
import { renderSpiral } from "./renderer";

const PREVIEW_N = 5000;

export function mountPrimeSpiralPreview(canvas: HTMLCanvasElement): () => void {
  const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
  const dpr = window.devicePixelRatio || 1;
  const cssSize = canvas.clientWidth || 280;
  canvas.width = Math.round(cssSize * dpr);
  canvas.height = Math.round(cssSize * dpr);

  const cs = getComputedStyle(document.documentElement);
  const faint = cs.getPropertyValue("--text-faint").trim() || "#75828a";

  const data = buildSpiralData(PREVIEW_N);
  const midFrame = Math.max(1, Math.floor(data.n * 0.6));
  let frame = midFrame;
  let displayScale = 0;
  let rafId = 0;
  let last = 0;
  let hovering = false;

  const draw = (shownFrame: number, snap: boolean, dt: number): void => {
    const shown = Math.min(Math.ceil(shownFrame), data.n);
    const half = Math.max(1, shown);
    const target = fitFromExtent(half, half, canvas.width, canvas.height, Math.max(2, half * 0.06));
    displayScale = snap ? target.scale : easeScale(displayScale, target.scale, dt);
    renderSpiral(
      ctx,
      { scale: displayScale, offsetX: target.offsetX, offsetY: target.offsetY },
      data,
      shown,
      {
        colorMod: 44,
        showAll: false,
        dotScale: 1,
        faint,
        canvasW: canvas.width,
        canvasH: canvas.height,
      },
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
    frame += (200 + frame * 0.9) * Math.min(dt, 0.1);
    if (frame > data.n + 60) {
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
    frame = 0; // replay the reveal from the origin while hovered
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
