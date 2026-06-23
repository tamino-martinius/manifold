import "../../styles/manifold/styles.css";
import "./chessboard.css";
import { el } from "../../shared/dom";
import { pageFooter } from "../../shared/footer";
import { icon } from "../../shared/icons";
import { initTheme } from "../../shared/theme";
import { themeToggle } from "../../shared/theme-toggle";
import { createAnimator } from "./animation";
import { easeScale, fitFromExtent } from "./camera";
import { createEngine } from "./engine";
import { CHESSBOARD_LINKS, type ResourceLink } from "./links";
import { mountPanel } from "./panel/panel";
import { renderBoard } from "./renderer";
import { type ChessboardState, createChessboardStore } from "./state";
import type { PlacedData } from "./types";

// Higher = snappier zoom easing (per-second exponential rate).
const ZOOM_SMOOTH_RATE = 8;
// Relative (accelerating) placement rate: starts slow, grows with how many are
// already placed, so early pieces are watchable and large fills race to the end.
const BASE_RATE = 6; // pieces/sec near the start
const GROWTH_RATE = 1.1; // + this fraction of the placed count per second

function linkItem(link: ResourceLink): HTMLElement {
  return el(
    "a",
    {
      className: `cb-link cb-link--${link.kind}`,
      href: link.url,
      target: "_blank",
      rel: "noopener noreferrer",
      title: link.title,
    },
    [
      icon(link.kind === "video" ? "youtube" : "hash", 16),
      el("span", { className: "cb-link-text" }, [
        el("span", { className: "cb-link-title" }, [link.title]),
        el("span", { className: "ds-label cb-link-label" }, [link.label]),
      ]),
    ],
  );
}

// A toolbar dropdown of related links (fixed-positioned so it escapes the
// toolbar, closes on outside-click / scroll / link-click).
function linkDropdown(label: string, links: ResourceLink[]): HTMLElement {
  const menu = el("div", { className: "cb-dd-menu" });
  for (const l of links) menu.append(linkItem(l));
  const trigger = el("button", { type: "button", className: "cb-dd-trigger" }, [
    el("span", {}, [label]),
    icon("chevron-down", 13),
  ]);
  const wrap = el("div", { className: "cb-dd" }, [trigger]);

  const onDoc = (e: MouseEvent): void => {
    if (!wrap.contains(e.target as Node) && !menu.contains(e.target as Node)) close();
  };
  const onScroll = (e: Event): void => {
    if (!menu.contains(e.target as Node)) close();
  };
  function close(): void {
    menu.classList.remove("is-open");
    menu.remove();
    document.removeEventListener("mousedown", onDoc);
    window.removeEventListener("scroll", onScroll, true);
    window.removeEventListener("resize", close);
  }
  function open(): void {
    // Portal the menu to <body> so it isn't clipped behind the canvas by the
    // toolbar's backdrop-filter stacking context. Capped to 400px tall.
    document.body.append(menu);
    const rect = trigger.getBoundingClientRect();
    menu.style.top = `${Math.round(rect.bottom + 6)}px`;
    menu.style.right = `${Math.round(window.innerWidth - rect.right)}px`;
    menu.style.maxHeight = `${Math.min(400, Math.max(160, Math.floor(window.innerHeight - rect.bottom - 16)))}px`;
    menu.classList.add("is-open");
    document.addEventListener("mousedown", onDoc);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", close);
  }
  trigger.addEventListener("click", () => (menu.classList.contains("is-open") ? close() : open()));
  menu.addEventListener("click", (e) => {
    if ((e.target as HTMLElement).closest("a")) close();
  });
  return wrap;
}

function toolbar(): HTMLElement {
  const brand = el("a", { className: "cb-brand", href: "../", title: "Back to atlas" }, [
    el("span", { className: "cb-wordmark" }, ["manifold"]),
  ]);
  const right = el("div", { className: "cb-toolbar-right" });
  const videos = CHESSBOARD_LINKS.filter((l) => l.kind === "video");
  const refs = CHESSBOARD_LINKS.filter((l) => l.kind === "oeis");
  if (videos.length > 0) right.append(linkDropdown("Videos", videos));
  if (refs.length > 0) right.append(linkDropdown("OEIS", refs));
  right.append(themeToggle("cb-icon-btn cb-icon-btn--secondary"));

  return el("header", { className: "cb-toolbar" }, [
    el("div", { className: "cb-toolbar-left" }, [
      brand,
      el("span", { className: "cb-crumb ds-label" }, ["/ chessboard patterns"]),
    ]),
    right,
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
      pageFooter(),
    ]),
  );

  const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
  const store = createChessboardStore();
  const engine = createEngine(store);

  const resize = () => {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(wrap.clientWidth * dpr);
    canvas.height = Math.floor(wrap.clientHeight * dpr);
  };
  resize();
  window.addEventListener("resize", resize);

  // Loading overlay driven by worker compute progress.
  const bar = el("div", { className: "cb-loading-bar" });
  const overlay = el("div", { className: "cb-loading" }, [
    el("span", { className: "ds-label" }, ["computing placements"]),
    el("div", { className: "cb-loading-track" }, [bar]),
  ]);
  wrap.append(overlay);
  const syncOverlay = (s: ChessboardState) => {
    overlay.classList.toggle("is-visible", s.loading);
    bar.style.width = `${Math.round(s.progress * 100)}%`;
  };
  store.subscribe(syncOverlay);
  syncOverlay(store.get());

  // Incrementally tracked half-extent of the shown pieces, so the auto-fit
  // never rebuilds a coordinate array (cheap even at 100k).
  let displayScale = 0;
  let lastT = 0;
  let viewHalfX = 0;
  let viewHalfY = 0;
  let scannedTo = 0;
  let lastPlaced: PlacedData | null = null;
  // Dirty-flag: skip the (potentially large) redraw when nothing visible changed.
  let drawFrame = -1;
  let drawScale = -1;
  let drawW = -1;
  let drawH = -1;
  let drawPlaced: PlacedData | null = null;

  const render = () => {
    const s = store.get();
    const placed = s.placed;
    if (placed !== lastPlaced) {
      lastPlaced = placed;
      viewHalfX = viewHalfY = scannedTo = 0;
    }
    const count = Math.min(Math.floor(s.frame), placed.count);
    if (count < scannedTo) viewHalfX = viewHalfY = scannedTo = 0;
    for (let i = scannedTo; i < count; i++) {
      const ax = Math.abs(placed.xs[i]);
      const ay = Math.abs(placed.ys[i]);
      if (ax > viewHalfX) viewHalfX = ax;
      if (ay > viewHalfY) viewHalfY = ay;
    }
    scannedTo = count;

    const target = fitFromExtent(viewHalfX, viewHalfY, canvas.width, canvas.height, 4);
    const now = performance.now();
    const dt = lastT === 0 ? 0 : (now - lastT) / 1000;
    lastT = now;
    displayScale = easeScale(displayScale, target.scale, dt, ZOOM_SMOOTH_RATE);

    const dirty =
      count !== drawFrame ||
      Math.abs(displayScale - drawScale) > 1e-3 ||
      canvas.width !== drawW ||
      canvas.height !== drawH ||
      placed !== drawPlaced;
    if (!dirty) return;
    drawFrame = count;
    drawScale = displayScale;
    drawW = canvas.width;
    drawH = canvas.height;
    drawPlaced = placed;

    renderBoard(
      ctx,
      { scale: displayScale, offsetX: target.offsetX, offsetY: target.offsetY },
      placed,
      s.frame,
      canvas.width,
      canvas.height,
    );
  };

  mountPanel(panelEl, store, () => engine.recompute());

  const animator = createAnimator({
    isPlaying: () => store.get().playing,
    onTick: (dt) => {
      const s = store.get();
      const max = s.placed.count;
      if (max <= 0) return; // still computing — nothing to advance yet
      if (s.frame >= max) {
        store.set({ playing: false }); // reached the end → stops, button shows "Replay"
        return;
      }
      const speedFactor = s.speed / 30;
      const next = s.frame + (BASE_RATE + s.frame * GROWTH_RATE) * speedFactor * Math.min(dt, 0.1);
      store.set({ frame: Math.min(next, max) });
    },
    render,
  });
  animator.start();

  engine.recompute(); // kick off the first computation in the worker
}

const root = document.getElementById("app");
if (root) mount(root);
