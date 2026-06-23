import "../../styles/manifold/styles.css";
import "../chessboard/chessboard.css"; // reuse the cb- studio chrome verbatim
import "./collatz.css";
import { el } from "../../shared/dom";
import { icon } from "../../shared/icons";
import { initTheme } from "../../shared/theme";
import { themeToggle } from "../../shared/theme-toggle";
import { createAnimator } from "../chessboard/animation";
import { easeScale, fitScale } from "./camera";
import type { CollatzGeometry } from "./collatz";
import { createEngine } from "./engine";
import { COLLATZ_LINKS, type ResourceLink } from "./links";
import { mountPanel } from "./panel";
import { renderCoral } from "./renderer";
import { type CollatzState, createCollatzStore } from "./state";

// Higher = snappier zoom easing (per-second exponential rate).
const ZOOM_SMOOTH_RATE = 8;
// Relative (accelerating) reveal rate, in depth-rings/sec: starts gentle so the
// trunk is watchable, grows so the dense deep rings fill in quickly.
const BASE_RATE = 6;
const GROWTH_RATE = 0.9;

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

// A toolbar dropdown of related links (portaled to <body> so it escapes the
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
  const videos = COLLATZ_LINKS.filter((l) => l.kind === "video");
  const refs = COLLATZ_LINKS.filter((l) => l.kind === "oeis");
  if (videos.length > 0) right.append(linkDropdown("Videos", videos));
  if (refs.length > 0) right.append(linkDropdown("OEIS", refs));
  right.append(themeToggle("cb-icon-btn cb-icon-btn--secondary"));

  return el("header", { className: "cb-toolbar" }, [
    el("div", { className: "cb-toolbar-left" }, [
      brand,
      el("span", { className: "cb-crumb ds-label" }, ["/ collatz coral"]),
    ]),
    right,
  ]);
}

function readAccent(): string {
  return (
    getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() || "#3ddc84"
  );
}

// Frame-rate-independent exponential ease toward a target, for the camera center
// (unlike easeScale there is no `<=0` snap sentinel — a coordinate can be 0/negative).
function easeTo(current: number, target: number, dt: number, rate: number): number {
  return current + (target - current) * (1 - Math.exp(-rate * Math.min(Math.max(dt, 0), 0.1)));
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
  const store = createCollatzStore();
  const engine = createEngine(store);

  const resize = () => {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(wrap.clientWidth * dpr);
    canvas.height = Math.floor(wrap.clientHeight * dpr);
  };
  resize();
  window.addEventListener("resize", resize);

  // Loading overlay (kept for studio parity; the sync build is fast enough that
  // it stays hidden, but it's driven from loading/progress all the same).
  const bar = el("div", { className: "cb-loading-bar" });
  const overlay = el("div", { className: "cb-loading" }, [
    el("span", { className: "ds-label" }, ["growing coral"]),
    el("div", { className: "cb-loading-track" }, [bar]),
  ]);
  wrap.append(overlay);
  const syncOverlay = (s: CollatzState) => {
    overlay.classList.toggle("is-visible", s.loading);
    bar.style.width = `${Math.round(s.progress * 100)}%`;
  };
  store.subscribe(syncOverlay);
  syncOverlay(store.get());

  // Eased camera (scale + center) + dirty-flag so we skip the redraw when nothing
  // visible changed. The camera fits the *revealed-so-far* extent and eases toward
  // it, so the coral stays framed as it grows (the camera pulls back ring by ring)
  // instead of sitting tiny in a corner of the final extent.
  let displayScale = 0;
  let displayCx = 0;
  let displayCy = 0;
  let lastT = 0;
  let easeGeom: CollatzGeometry | null = null;
  // Cached revealed-extent box, rescanned only when the reveal depth or geom change.
  let boundsGeom: CollatzGeometry | null = null;
  let boundsReveal = -1;
  let bMinX = 0;
  let bMaxX = 0;
  let bMinY = 0;
  let bMaxY = 0;
  let drawReveal = -1;
  let drawScale = -1;
  let drawCx = Number.NaN;
  let drawCy = Number.NaN;
  let drawW = -1;
  let drawH = -1;
  let drawGeom: CollatzGeometry | null = null;
  let drawOpacity = -1;
  let drawColorMode = "";
  let drawAccent = "";

  const render = () => {
    const s = store.get();
    const g = s.geom;
    const now = performance.now();
    const dt = lastT === 0 ? 0 : (now - lastT) / 1000;
    lastT = now;

    const revealMax = Math.min(Math.floor(s.frame), g.maxDepth);
    // Recompute the revealed bounding box only when the depth threshold or geometry
    // changes (so idle frames don't rescan). The root (0,0) is always included.
    if (g !== boundsGeom || revealMax !== boundsReveal) {
      boundsGeom = g;
      boundsReveal = revealMax;
      let mnX = 0;
      let mxX = 0;
      let mnY = 0;
      let mxY = 0;
      const { x1s, y1s, depths } = g;
      for (let e = 0; e < g.edgeCount; e++) {
        if (depths[e] > revealMax) continue;
        const x = x1s[e];
        const y = y1s[e];
        if (x < mnX) mnX = x;
        else if (x > mxX) mxX = x;
        if (y < mnY) mnY = y;
        else if (y > mxY) mxY = y;
      }
      // Floor the extent to a few segments so the first rings don't blow up the fit.
      const minHalf = Math.max(s.segLen * 4, 1e-3);
      if (mxX - mnX < minHalf * 2) {
        const c = (mnX + mxX) / 2;
        mnX = c - minHalf;
        mxX = c + minHalf;
      }
      if (mxY - mnY < minHalf * 2) {
        const c = (mnY + mxY) / 2;
        mnY = c - minHalf;
        mxY = c + minHalf;
      }
      bMinX = mnX;
      bMaxX = mxX;
      bMinY = mnY;
      bMaxY = mxY;
    }

    const targetScale = fitScale(bMinX, bMaxX, bMinY, bMaxY, canvas.width, canvas.height);
    const targetCx = (bMinX + bMaxX) / 2;
    const targetCy = (bMinY + bMaxY) / 2;

    // Snap (not glide) the first time a real coral appears, so the opening play is
    // framed correctly instead of easing in from the meaningless empty-geom fit.
    if (g !== easeGeom) {
      if (easeGeom === null || easeGeom.edgeCount === 0) {
        displayScale = 0; // 0 => easeScale snaps to the target
        displayCx = targetCx;
        displayCy = targetCy;
      }
      easeGeom = g;
    }
    displayScale = easeScale(displayScale, targetScale, dt, ZOOM_SMOOTH_RATE);
    displayCx = easeTo(displayCx, targetCx, dt, ZOOM_SMOOTH_RATE);
    displayCy = easeTo(displayCy, targetCy, dt, ZOOM_SMOOTH_RATE);

    const accent = readAccent();
    const dirty =
      revealMax !== drawReveal ||
      Math.abs(displayScale - drawScale) > 1e-3 ||
      Math.abs(displayCx - drawCx) > 1e-3 ||
      Math.abs(displayCy - drawCy) > 1e-3 ||
      canvas.width !== drawW ||
      canvas.height !== drawH ||
      g !== drawGeom ||
      s.opacity !== drawOpacity ||
      s.colorMode !== drawColorMode ||
      accent !== drawAccent;
    if (!dirty) return;
    drawReveal = revealMax;
    drawScale = displayScale;
    drawCx = displayCx;
    drawCy = displayCy;
    drawW = canvas.width;
    drawH = canvas.height;
    drawGeom = g;
    drawOpacity = s.opacity;
    drawColorMode = s.colorMode;
    drawAccent = accent;

    const cam = {
      scale: displayScale,
      offsetX: canvas.width / 2 - displayCx * displayScale,
      offsetY: canvas.height / 2 + displayCy * displayScale,
    };
    renderCoral(ctx, cam, g, {
      frame: s.frame,
      opacity: s.opacity,
      colorMode: s.colorMode,
      accent,
      dark: document.documentElement.dataset.theme !== "light",
      canvasW: canvas.width,
      canvasH: canvas.height,
    });
  };

  mountPanel(panelEl, store, () => engine.recompute());

  const animator = createAnimator({
    isPlaying: () => store.get().playing,
    onTick: (dt) => {
      const s = store.get();
      const max = s.geom.maxDepth;
      if (max <= 0) return; // still building — nothing to reveal yet
      if (s.frame >= max) {
        store.set({ playing: false }); // fully grown → stops, button shows "Replay"
        return;
      }
      const speedFactor = s.speed / 30;
      const next = s.frame + (BASE_RATE + s.frame * GROWTH_RATE) * speedFactor * Math.min(dt, 0.1);
      store.set({ frame: Math.min(next, max) });
    },
    render,
  });
  animator.start();

  engine.recompute(); // build the first coral
}

const root = document.getElementById("app");
if (root) mount(root);
