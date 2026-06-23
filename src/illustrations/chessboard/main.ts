import "../../styles/manifold/styles.css";
import "./chessboard.css";
import logoMark from "../../assets/manifold/logo-mark.svg?raw";
import { el } from "../../shared/dom";
import { initTheme } from "../../shared/theme";
import { themeToggle } from "../../shared/theme-toggle";
import { createAnimator } from "./animation";
import { type Camera, easeScale, fitCamera } from "./camera";
import { mountPanel } from "./panel/panel";
import { renderBoard } from "./renderer";
import { createChessboardStore, recomputePlacements } from "./state";

// Higher = snappier zoom easing (per-second exponential rate).
const ZOOM_SMOOTH_RATE = 8;

function logo(): HTMLElement {
  const span = el("span", { className: "cb-logo", "aria-hidden": "true" });
  span.innerHTML = logoMark;
  return span;
}

function toolbar(): HTMLElement {
  const brand = el("a", { className: "cb-brand", href: "../", title: "Back to atlas" }, [
    logo(),
    el("span", { className: "cb-wordmark" }, ["manifold"]),
  ]);
  return el("header", { className: "cb-toolbar" }, [
    el("div", { className: "cb-toolbar-left" }, [
      brand,
      el("span", { className: "cb-crumb ds-label" }, ["/ chessboard patterns"]),
    ]),
    el("div", { className: "cb-toolbar-right" }, [
      themeToggle("cb-icon-btn cb-icon-btn--secondary"),
    ]),
  ]);
}

function mount(root: HTMLElement): void {
  initTheme();
  const canvas = el("canvas") as HTMLCanvasElement;
  const wrap = el("div", { className: "cb-canvas-wrap ds-dot-bg" }, [canvas]);
  const panelEl = el("aside", { className: "cb-panel" });
  root.append(
    el("div", { className: "cb-studio" }, [
      toolbar(),
      el("div", { className: "cb-body" }, [wrap, panelEl]),
    ]),
  );

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
    const dt = lastT === 0 ? 0 : (now - lastT) / 1000;
    lastT = now;
    displayScale = easeScale(displayScale, target.scale, dt, ZOOM_SMOOTH_RATE);

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
