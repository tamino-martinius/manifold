import { easeScale, fitFromExtent } from "../chessboard/camera";
import { buildUlamData } from "./compute";
import { createExtentTracker } from "./extent";
import { renderUlam } from "./renderer";

// Small N that still shows the Euler diagonal clearly (E(0..39) reach 1601).
const PREVIEW_N = 2400;

export function mountUlamPreview(canvas: HTMLCanvasElement): () => void {
  const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
  const dpr = window.devicePixelRatio || 1;
  const cssSize = canvas.clientWidth || 280;
  canvas.width = Math.round(cssSize * dpr);
  canvas.height = Math.round(cssSize * dpr);

  const data = buildUlamData(PREVIEW_N, "euler", { a: 1, b: 1, c: 41 });
  const tracker = createExtentTracker();
  let frame = PREVIEW_N; // static frame shows the full lit spiral + amber diagonal
  let displayScale = 0;
  let rafId = 0;
  let last = 0;
  let hovering = false;

  const draw = (shownFrame: number, snap: boolean, dt: number): void => {
    const count = Math.min(Math.floor(shownFrame), PREVIEW_N);
    const { halfX, halfY } = tracker.to(count);
    const target = fitFromExtent(halfX, halfY, canvas.width, canvas.height, 3);
    displayScale = snap ? target.scale : easeScale(displayScale, target.scale, dt);
    renderUlam(
      ctx,
      { scale: displayScale, offsetX: target.offsetX, offsetY: target.offsetY },
      data,
      shownFrame,
      canvas.width,
      canvas.height,
    );
  };

  const renderStatic = (): void => {
    frame = PREVIEW_N;
    displayScale = 0;
    draw(frame, true, 0);
  };

  const tick = (now: number): void => {
    if (!hovering) return;
    const dt = last === 0 ? 0 : (now - last) / 1000;
    last = now;
    frame += (300 + frame * 1.2) * dt; // accelerating reveal, like the studio
    if (frame > PREVIEW_N + 40) {
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
    frame = 0;
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
