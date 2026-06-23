import { type Camera, framePrefix } from "./camera";
import { generateDragon } from "./dragon";
import { readDragonPalette, renderDragon } from "./renderer";

// Kept light (low order) — many previews run at once on the gallery grid.
const PREVIEW_ORDER = 11;
const FIT_MARGIN = 0.08; // breathing room as a fraction of the fit radius
const GROW_ORDERS_PER_SEC = 5; // iterate 1 → 11 in ~2s
const HOLD_SECONDS = 0.7; // pause at the full dragon before looping
const MIN_FRAME = 1;

export function mountDragonPreview(canvas: HTMLCanvasElement): () => void {
  const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
  const dpr = window.devicePixelRatio || 1;
  const cssSize = canvas.clientWidth || 280;
  canvas.width = Math.round(cssSize * dpr);
  canvas.height = Math.round(cssSize * dpr);

  // The finished dragon, generated once; the hover animation reveals a growing
  // prefix of it — mirroring the studio's iteration timeline (the curve builds
  // up order by order), not a fold-angle morph.
  const geom = generateDragon(PREVIEW_ORDER, Math.PI / 2);

  let rafId = 0;
  let last = 0;
  let hovering = false;
  let frame = PREVIEW_ORDER; // static frame = the finished dragon
  let holdLeft = 0;

  const draw = (f: number): void => {
    const nseg = Math.min(Math.max(Math.round(2 ** f), 1), geom.count);
    // Rotation-stable fit on the revealed prefix: centred on its centroid, so
    // the growing dragon stays framed without snapping between orders.
    const fr = framePrefix(geom.points, nseg);
    const radius = Math.max(fr.rSingle, 1e-6);
    const scale = Math.min(canvas.width, canvas.height) / (2 * radius * (1 + FIT_MARGIN));
    const cam: Camera = {
      scale,
      offsetX: canvas.width / 2 - fr.cx * scale,
      offsetY: canvas.height / 2 + fr.cy * scale,
    };
    const palette = readDragonPalette();
    renderDragon(
      ctx,
      cam,
      geom,
      {
        colorMode: "position",
        tiling: false,
        accent: palette.accent,
        hues: palette.hues,
        ramp: palette.ramp,
        hueRamps: palette.hueRamps,
        lineWidth: 1.4 * dpr,
        limit: nseg,
      },
      canvas.width,
      canvas.height,
    );
  };

  const renderStatic = (): void => {
    frame = PREVIEW_ORDER;
    holdLeft = 0;
    draw(PREVIEW_ORDER);
  };

  const tick = (now: number): void => {
    if (!hovering) return;
    const dt = last === 0 ? 0 : (now - last) / 1000;
    last = now;
    if (holdLeft > 0) {
      holdLeft -= dt;
      if (holdLeft <= 0) frame = MIN_FRAME; // restart the grow (snaps to order 1)
    } else {
      frame += GROW_ORDERS_PER_SEC * dt;
      if (frame >= PREVIEW_ORDER) {
        frame = PREVIEW_ORDER;
        holdLeft = HOLD_SECONDS;
      }
    }
    draw(frame);
    rafId = requestAnimationFrame(tick);
  };

  const card: Element = canvas.closest(".m-card") ?? canvas;
  const onEnter = (): void => {
    if (hovering) return;
    hovering = true;
    frame = MIN_FRAME; // grow from the start while hovered
    holdLeft = 0;
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
