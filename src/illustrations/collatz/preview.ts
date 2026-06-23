import { fitBounds } from "./camera";
import { buildGeometry } from "./collatz";
import { renderCoral } from "./renderer";

const DEG = Math.PI / 180;

export function mountCollatzPreview(canvas: HTMLCanvasElement): () => void {
  const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
  const dpr = window.devicePixelRatio || 1;
  const cssSize = canvas.clientWidth || 280;
  canvas.width = Math.round(cssSize * dpr);
  canvas.height = Math.round(cssSize * dpr);

  const geom = buildGeometry({
    n: 700,
    thetaEvenRad: 8 * DEG,
    thetaOddRad: 16 * DEG,
    segLen: 1.6,
    lenVar: 0.35,
  });
  const accent = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim();
  // The bounding box is fixed (geometry never changes here), so the camera is too;
  // only the reveal `frame` grows. No zoom easing needed.
  const cam = fitBounds(geom.minX, geom.maxX, geom.minY, geom.maxY, canvas.width, canvas.height);
  const maxFrame = geom.maxDepth;
  const midFrame = Math.max(1, Math.floor(maxFrame * 0.6));
  let frame = midFrame;
  let rafId = 0;
  let last = 0;
  let hovering = false;

  const draw = (shownFrame: number): void => {
    renderCoral(ctx, cam, geom, {
      frame: shownFrame,
      opacity: 0.4,
      colorMode: "depth-gradient",
      accent,
      dark: document.documentElement.dataset.theme !== "light",
      canvasW: canvas.width,
      canvasH: canvas.height,
    });
  };

  const renderStatic = (): void => {
    frame = midFrame;
    draw(frame);
  };

  const tick = (now: number): void => {
    if (!hovering) return;
    const dt = last === 0 ? 0 : (now - last) / 1000;
    last = now;
    frame += 26 * dt; // depth-rings per second
    if (frame > maxFrame + 6) {
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
    frame = 0; // grow the coral from the root while hovered
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
