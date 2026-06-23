import { easeScale, fitFromExtent } from "./camera";
import { computeToothpicks, packToothpicks } from "./growth";
import { defaultShapes } from "./presets";
import { renderToothpicks } from "./renderer";

export function mountToothpickPreview(canvas: HTMLCanvasElement): () => void {
  const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
  const dpr = window.devicePixelRatio || 1;
  const cssSize = canvas.clientWidth || 280;
  canvas.width = Math.round(cssSize * dpr);
  canvas.height = Math.round(cssSize * dpr);

  const placed = packToothpicks(computeToothpicks(defaultShapes(), "round-robin", 14));
  const midFrame = Math.max(1, Math.floor(placed.count * 0.6));
  let frame = midFrame;
  let displayScale = 0;
  let rafId = 0;
  let last = 0;
  let hovering = false;

  const draw = (shownFrame: number, snap: boolean, dt: number): void => {
    const shown = Math.min(Math.ceil(shownFrame), placed.count);
    let hx = 0;
    let hy = 0;
    for (let i = 0; i < placed.segCount; i++) {
      if (placed.instanceIndex[i] >= shown) break;
      hx = Math.max(hx, Math.abs(placed.x1[i]), Math.abs(placed.x2[i]));
      hy = Math.max(hy, Math.abs(placed.y1[i]), Math.abs(placed.y2[i]));
    }
    const target = fitFromExtent(hx, hy, canvas.width, canvas.height, 2);
    displayScale = snap ? target.scale : easeScale(displayScale, target.scale, dt);
    renderToothpicks(
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
    frame += 26 * dt;
    if (frame > placed.count + 12) {
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
