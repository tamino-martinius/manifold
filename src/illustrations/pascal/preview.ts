import { easeScale, fitBounds } from "./camera";
import { readThemeColors } from "./colors";
import { buildResidues } from "./pascal";
import { renderPascal } from "./renderer";

// Match the studio defaults: m=4 (composite) colored by residue hue, 512 rows.
const PREVIEW_M = 4;
const PREVIEW_ROWS = 512;
const PADDING = 2;

export function mountPascalPreview(canvas: HTMLCanvasElement): () => void {
  const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
  const dpr = window.devicePixelRatio || 1;
  const cssSize = canvas.clientWidth || 280;
  canvas.width = Math.round(cssSize * dpr);
  canvas.height = Math.round(cssSize * dpr);

  const colors = readThemeColors();
  // Composite m needs the packed residue cache (Lucas only covers prime m); one
  // build per card mount, then every frame just reads from it.
  const residues = buildResidues(PREVIEW_ROWS, PREVIEW_M);
  const midFrame = Math.floor(PREVIEW_ROWS * 0.62);
  let frame = midFrame;
  let displayScale = 0;
  let rafId = 0;
  let last = 0;
  let hovering = false;

  const draw = (shownFrame: number, snap: boolean, dt: number): void => {
    const shown = Math.min(Math.ceil(shownFrame), PREVIEW_ROWS);
    const target = fitBounds(Math.max(1, shown), canvas.width, canvas.height, PADDING);
    displayScale = snap ? target.scale : easeScale(displayScale, target.scale, dt);
    renderPascal(
      ctx,
      { scale: displayScale, offsetX: target.offsetX, offsetY: PADDING * displayScale },
      { m: PREVIEW_M, colorMode: "hue", residues, colors },
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
    frame += (PREVIEW_ROWS / 3.5) * dt; // full reveal in ~3.5s, scaled to depth
    if (frame > PREVIEW_ROWS + 40) {
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
    frame = 0; // replay the reveal from the apex while hovered
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
