import { easeScale, fitFromExtent } from "../chessboard/camera";
import { createSeeker } from "./board";
import { computeGoMoves } from "./compute";
import { DEFAULT_PATTERN } from "./pattern";
import { renderGoBoard } from "./renderer";

export function mountGoPreview(canvas: HTMLCanvasElement): () => void {
  const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
  const dpr = window.devicePixelRatio || 1;
  const cssSize = canvas.clientWidth || 280;
  canvas.width = Math.round(cssSize * dpr);
  canvas.height = Math.round(cssSize * dpr);

  const data = computeGoMoves([...DEFAULT_PATTERN], 420);
  const seeker = createSeeker(data);
  const midFrame = Math.max(1, Math.floor(data.count * 0.6));
  let frame = midFrame;
  let displayScale = 0;
  let rafId = 0;
  let last = 0;
  let hovering = false;

  const draw = (shownFrame: number, snap: boolean, dt: number): void => {
    const shown = Math.min(Math.ceil(shownFrame), data.count);
    seeker.seekTo(shown);
    const halfX = shown > 0 ? data.halfX[shown - 1] : 0;
    const halfY = shown > 0 ? data.halfY[shown - 1] : 0;
    const target = fitFromExtent(halfX, halfY, canvas.width, canvas.height, 3);
    displayScale = snap ? target.scale : easeScale(displayScale, target.scale, dt);
    renderGoBoard(
      ctx,
      { scale: displayScale, offsetX: target.offsetX, offsetY: target.offsetY },
      seeker.board,
      seeker.territory,
      data.colors,
      false,
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
    frame += 90 * dt;
    if (frame > data.count + 30) {
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
