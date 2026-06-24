import { type AntSim, createSim, parseRule, stepN } from "./ant";
import { type Camera, easeScale, fitBounds } from "./camera";
import { renderAnt } from "./renderer";

// The gallery preview runs the LLRR turmite with the comet trail on — a compact,
// symmetric, multi-colour growing pattern that reads well at thumbnail size.
const RULE = "LLRR";
const STATIC_STEPS = 9_000; // at-rest frame: a well-developed symmetric pattern
const LOOP_STEPS = 13_000; // restart the hover animation once it runs past here
const PER_FRAME = 150; // steps per frame while hovered

function newSim(): AntSim {
  const sim = createSim(parseRule(RULE));
  sim.trackTrail = true; // record recently-flipped cells for the comet
  return sim;
}

export function mountLangtonsAntPreview(canvas: HTMLCanvasElement): () => void {
  const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
  const dpr = window.devicePixelRatio || 1;
  const cssSize = canvas.clientWidth || 280;
  canvas.width = Math.round(cssSize * dpr);
  canvas.height = Math.round(cssSize * dpr);

  let sim = newSim();
  let displayScale = 0;
  let rafId = 0;
  let last = 0;
  let hovering = false;

  const draw = (snap: boolean, dt: number): void => {
    const target = fitBounds(
      sim.minX,
      sim.maxX,
      sim.minY,
      sim.maxY,
      canvas.width,
      canvas.height,
      4,
    );
    displayScale = snap ? target.scale : easeScale(displayScale, target.scale, dt);
    const cx = (sim.minX + sim.maxX) / 2;
    const cy = (sim.minY + sim.maxY) / 2;
    const cam: Camera = {
      scale: displayScale,
      offsetX: canvas.width / 2 - cx * displayScale,
      offsetY: canvas.height / 2 + cy * displayScale,
    };
    renderAnt(ctx, cam, sim, canvas.width, canvas.height, true); // comet on
  };

  const renderStatic = (): void => {
    sim = newSim();
    stepN(sim, STATIC_STEPS);
    displayScale = 0;
    draw(true, 0);
  };

  const tick = (now: number): void => {
    if (!hovering) return;
    const dt = last === 0 ? 0 : (now - last) / 1000;
    last = now;
    stepN(sim, PER_FRAME);
    if (sim.steps > LOOP_STEPS) {
      sim = newSim();
      displayScale = 0;
      last = 0;
    }
    draw(false, dt);
    rafId = requestAnimationFrame(tick);
  };

  const card: Element = canvas.closest(".m-card") ?? canvas;
  const onEnter = (): void => {
    if (hovering) return;
    hovering = true;
    sim = newSim(); // play the growth from the start
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
