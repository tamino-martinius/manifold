import "./chessboard.css";
import { createAnimator } from "./animation";
import { type Camera, fitCamera } from "./camera";
import { mountPanel } from "./panel/panel";
import { renderBoard } from "./renderer";
import { createChessboardStore, recomputePlacements } from "./state";

// Higher = snappier zoom easing (per-second exponential rate).
const ZOOM_SMOOTH_RATE = 8;

function mount(root: HTMLElement): void {
  root.innerHTML = `
    <div class="cb-layout">
      <div class="cb-canvas-wrap">
        <div class="cb-topbar"><a href="../">← all illustrations</a></div>
        <canvas></canvas>
      </div>
      <aside class="cb-panel"></aside>
    </div>`;

  const wrap = root.querySelector(".cb-canvas-wrap") as HTMLElement;
  const canvas = root.querySelector("canvas") as HTMLCanvasElement;
  const panelEl = root.querySelector(".cb-panel") as HTMLElement;
  const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
  const store = createChessboardStore();

  const resize = () => {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(wrap.clientWidth * dpr);
    canvas.height = Math.floor(wrap.clientHeight * dpr);
  };
  resize();
  window.addEventListener("resize", resize);

  // Smoothly eased zoom: the camera scale glides toward its auto-fit target
  // instead of snapping each time the placed region grows. The origin-centered
  // camera keeps cell 1 fixed, so only the scale is eased.
  let displayScale = 0;
  let lastT = 0;
  const render = () => {
    const { placements, frame } = store.get();
    const count = Math.ceil(frame);
    const shown = placements.slice(0, count);
    const target = fitCamera(
      shown.map((p) => p.coord),
      canvas.width,
      canvas.height,
      4,
    );

    const now = performance.now();
    const dt = lastT === 0 ? 0 : Math.min((now - lastT) / 1000, 0.1);
    lastT = now;
    if (displayScale === 0) {
      displayScale = target.scale;
    } else {
      // Frame-rate-independent exponential smoothing (~0.12s time constant).
      const k = 1 - Math.exp(-ZOOM_SMOOTH_RATE * dt);
      displayScale += (target.scale - displayScale) * k;
    }

    const cam: Camera = {
      scale: displayScale,
      offsetX: target.offsetX,
      offsetY: target.offsetY,
    };
    renderBoard(ctx, cam, placements, count, canvas.width, canvas.height);
  };

  mountPanel(panelEl, store, () => {
    recomputePlacements(store);
  });

  const animator = createAnimator({
    isPlaying: () => store.get().playing,
    getSpeed: () => store.get().speed,
    getFrame: () => store.get().frame,
    getMax: () => store.get().placements.length,
    setFrame: (f) => store.set({ frame: f }),
    render,
  });
  animator.start();
}

const root = document.getElementById("app");
if (root) mount(root);
