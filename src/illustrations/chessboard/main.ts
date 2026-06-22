import "./chessboard.css";
import type { Store } from "../../shared/store";
import { createAnimator } from "./animation";
import { fitCamera } from "./camera";
import { mountPanel } from "./panel/panel";
import { renderBoard } from "./renderer";
import { type ChessboardState, createChessboardStore, recomputePlacements } from "./state";

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

  const render = () => renderFrame(ctx, canvas, store);
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

function renderFrame(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  store: Store<ChessboardState>,
): void {
  const { placements, frame } = store.get();
  const shown = placements.slice(0, Math.ceil(frame));
  const cam = fitCamera(
    shown.map((p) => p.coord),
    canvas.width,
    canvas.height,
    4,
  );
  renderBoard(ctx, cam, placements, Math.ceil(frame), canvas.width, canvas.height);
}

const root = document.getElementById("app");
if (root) mount(root);
