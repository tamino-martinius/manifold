import "../../styles/manifold/styles.css";
import "../chessboard/chessboard.css";
import "./go.css";
import { el } from "../../shared/dom";
import { pageFooter } from "../../shared/footer";
import { icon } from "../../shared/icons";
import { initTheme } from "../../shared/theme";
import { themeToggle } from "../../shared/theme-toggle";
import { createAnimator } from "../chessboard/animation";
import { easeScale, fitFromExtent } from "../chessboard/camera";
import { createSeeker } from "./board";
import { createEngine } from "./engine";
import { GO_LINKS, type ResourceLink } from "./links";
import { mountGoPanel } from "./panel/panel";
import { renderGoBoard } from "./renderer";
import { type GoState, createGoStore } from "./state";
import type { GoData } from "./types";

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
  if (GO_LINKS.length > 0) right.append(linkDropdown("Reference", GO_LINKS));
  right.append(themeToggle("cb-icon-btn cb-icon-btn--secondary"));
  return el("header", { className: "cb-toolbar" }, [
    el("div", { className: "cb-toolbar-left" }, [
      brand,
      el("span", { className: "cb-crumb ds-label" }, ["/ go patterns"]),
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
  const store = createGoStore();
  const engine = createEngine(store);

  const resize = () => {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(wrap.clientWidth * dpr);
    canvas.height = Math.floor(wrap.clientHeight * dpr);
  };
  resize();
  window.addEventListener("resize", resize);

  const bar = el("div", { className: "cb-loading-bar" });
  const overlay = el("div", { className: "cb-loading" }, [
    el("span", { className: "ds-label" }, ["computing moves"]),
    el("div", { className: "cb-loading-track" }, [bar]),
  ]);
  wrap.append(overlay);
  const syncOverlay = (s: GoState) => {
    overlay.classList.toggle("is-visible", s.loading);
    bar.style.width = `${Math.round(s.progress * 100)}%`;
  };
  store.subscribe(syncOverlay);
  syncOverlay(store.get());

  const ZOOM_SMOOTH_RATE = 8;
  const BASE_RATE = 6;
  const GROWTH_RATE = 1.1;

  let displayScale = 0;
  let lastT = 0;
  let seeker = createSeeker(store.get().data);
  let seekerData: GoData = store.get().data;
  let drawFrame = -1;
  let drawScale = -1;
  let drawW = -1;
  let drawH = -1;

  const render = () => {
    const s = store.get();
    if (s.data !== seekerData) {
      seeker = createSeeker(s.data);
      seekerData = s.data;
      drawFrame = -1; // force redraw on new data
    }
    const count = Math.min(Math.floor(s.frame), s.data.count);
    seeker.seekTo(count);

    const halfX = count > 0 ? s.data.halfX[count - 1] : 0;
    const halfY = count > 0 ? s.data.halfY[count - 1] : 0;
    const target = fitFromExtent(halfX, halfY, canvas.width, canvas.height, 4);
    const now = performance.now();
    const dt = lastT === 0 ? 0 : (now - lastT) / 1000;
    lastT = now;
    displayScale = easeScale(displayScale, target.scale, dt, ZOOM_SMOOTH_RATE);

    const dirty =
      count !== drawFrame ||
      Math.abs(displayScale - drawScale) > 1e-3 ||
      canvas.width !== drawW ||
      canvas.height !== drawH;
    if (!dirty) return;
    drawFrame = count;
    drawScale = displayScale;
    drawW = canvas.width;
    drawH = canvas.height;

    renderGoBoard(
      ctx,
      { scale: displayScale, offsetX: target.offsetX, offsetY: target.offsetY },
      seeker.board,
      s.data.colors,
      canvas.width,
      canvas.height,
    );
  };

  mountGoPanel(panelEl, store, () => engine.recompute());

  const animator = createAnimator({
    isPlaying: () => store.get().playing,
    onTick: (dt) => {
      const s = store.get();
      const max = s.data.count;
      if (max <= 0) return;
      if (s.frame >= max) {
        store.set({ playing: false });
        return;
      }
      const speedFactor = s.speed / 30;
      const next = s.frame + (BASE_RATE + s.frame * GROWTH_RATE) * speedFactor * Math.min(dt, 0.1);
      store.set({ frame: Math.min(next, max) });
    },
    render,
  });
  animator.start();

  engine.recompute();
}

const root = document.getElementById("app");
if (root) mount(root);
