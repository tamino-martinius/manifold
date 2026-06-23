import "../../styles/manifold/styles.css";
import "../chessboard/chessboard.css";
import "./goldbach.css";
import { el } from "../../shared/dom";
import { pageFooter } from "../../shared/footer";
import { icon } from "../../shared/icons";
import { initTheme } from "../../shared/theme";
import { themeToggle } from "../../shared/theme-toggle";
import { createAnimator } from "../chessboard/animation";
import { easeScale } from "../chessboard/camera";
import { createEngine } from "./engine";
import { GOLDBACH_LINKS, type ResourceLink } from "./links";
import { mountPanel } from "./panel/panel";
import { renderComet } from "./renderer";
import { type GoldbachState, createGoldbachStore } from "./state";

// Relative (accelerating) reveal rate: starts slow so the sparse early comet is
// watchable, then races as more of the cloud is already shown.
const BASE_RATE = 8; // points/sec near the start
const GROWTH_RATE = 1.1; // + this fraction of the revealed count per second
// Auto-fit easing (per-second exponential rate) + a little y-axis headroom so
// the tallest revealed dot never sits flush against the top edge.
const FIT_SMOOTH_RATE = 8;
const Y_HEADROOM = 1.08;

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
// toolbar's stacking context; closes on outside-click / scroll / link-click).
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
  const videos = GOLDBACH_LINKS.filter((l) => l.kind === "video");
  const refs = GOLDBACH_LINKS.filter((l) => l.kind === "oeis");
  if (videos.length > 0) right.append(linkDropdown("Videos", videos));
  if (refs.length > 0) right.append(linkDropdown("OEIS", refs));
  right.append(themeToggle("cb-icon-btn cb-icon-btn--secondary"));

  return el("header", { className: "cb-toolbar" }, [
    el("div", { className: "cb-toolbar-left" }, [
      brand,
      el("span", { className: "cb-crumb ds-label" }, ["/ goldbach's comet"]),
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
  const store = createGoldbachStore();
  const engine = createEngine(store);

  let dpr = window.devicePixelRatio || 1;
  const resize = () => {
    dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(wrap.clientWidth * dpr);
    canvas.height = Math.floor(wrap.clientHeight * dpr);
  };
  resize();
  window.addEventListener("resize", resize);

  // Loading overlay (only shown for the worker path at large N).
  const bar = el("div", { className: "cb-loading-bar" });
  const overlay = el("div", { className: "cb-loading" }, [
    el("span", { className: "ds-label" }, ["counting prime pairs"]),
    el("div", { className: "cb-loading-track" }, [bar]),
  ]);
  wrap.append(overlay);
  const syncOverlay = (s: GoldbachState) => {
    overlay.classList.toggle("is-visible", s.loading);
    bar.style.width = `${Math.round(s.progress * 100)}%`;
  };
  store.subscribe(syncOverlay);
  syncOverlay(store.get());

  // Dirty-flag: skip the (potentially large) redraw when nothing visible changed.
  let dReveal = -1;
  let dColorBy = "";
  let dSize = -1;
  let dAlpha = -1;
  let dW = -1;
  let dH = -1;
  let dTheme = "";
  let dData: GoldbachState["data"] | null = null;
  let dFitN = -1;
  let dFitMaxG = -1;

  // Auto-fit the axes to the currently revealed values, eased so the plane
  // zooms out smoothly as the comet grows (mirrors the chessboard camera). The
  // revealed max-g is tracked incrementally so the per-frame work stays O(new).
  let fitData: GoldbachState["data"] | null = null;
  let scannedTo = 0;
  let revealMaxG = 0;
  let displayN = 0;
  let displayMaxG = 0;
  let lastT = 0;

  const render = () => {
    const s = store.get();
    const data = s.data;
    const count = data.E.length;
    const reveal = Math.min(Math.floor(s.frame), count);

    if (data !== fitData) {
      fitData = data;
      scannedTo = 0;
      revealMaxG = 0;
      displayN = 0; // snap (no zoom-from-nothing) on a fresh compute
      displayMaxG = 0;
    }
    if (reveal < scannedTo) {
      scannedTo = 0; // scrubbed backwards — rescan the (now shorter) prefix
      revealMaxG = 0;
    }
    for (let i = scannedTo; i < reveal; i++) {
      if (data.g[i] > revealMaxG) revealMaxG = data.g[i];
    }
    scannedTo = reveal;

    const targetN = reveal > 0 ? data.E[reveal - 1] : 1;
    const targetMaxG = Math.max(1, revealMaxG * Y_HEADROOM);
    const now = performance.now();
    const dt = lastT === 0 ? 0 : (now - lastT) / 1000;
    lastT = now;
    displayN = easeScale(displayN, targetN, dt, FIT_SMOOTH_RATE);
    displayMaxG = easeScale(displayMaxG, targetMaxG, dt, FIT_SMOOTH_RATE);

    const theme = document.documentElement.dataset.theme ?? "dark";
    if (
      reveal === dReveal &&
      s.colorBy === dColorBy &&
      s.pointSize === dSize &&
      s.pointAlpha === dAlpha &&
      canvas.width === dW &&
      canvas.height === dH &&
      theme === dTheme &&
      data === dData &&
      Math.abs(displayN - dFitN) < 0.5 &&
      Math.abs(displayMaxG - dFitMaxG) < 0.01
    ) {
      return;
    }
    dReveal = reveal;
    dColorBy = s.colorBy;
    dSize = s.pointSize;
    dAlpha = s.pointAlpha;
    dW = canvas.width;
    dH = canvas.height;
    dTheme = theme;
    dData = data;
    dFitN = displayN;
    dFitMaxG = displayMaxG;

    renderComet(
      ctx,
      data,
      {
        revealCount: reveal,
        colorBy: s.colorBy,
        pointSize: s.pointSize,
        pointAlpha: s.pointAlpha,
        dpr,
        fitN: displayN,
        fitMaxG: displayMaxG,
      },
      canvas.width,
      canvas.height,
    );
  };

  mountPanel(panelEl, store, () => engine.recompute());

  const animator = createAnimator({
    isPlaying: () => store.get().playing,
    onTick: (dt) => {
      const s = store.get();
      const max = s.data.E.length;
      if (max <= 0) return; // still computing — nothing to reveal yet
      if (s.frame >= max) {
        store.set({ playing: false }); // reached the end → button shows "Replay"
        return;
      }
      const speedFactor = s.speed / 30;
      const next = s.frame + (BASE_RATE + s.frame * GROWTH_RATE) * speedFactor * Math.min(dt, 0.1);
      store.set({ frame: Math.min(next, max) });
    },
    render,
  });
  animator.start();

  engine.recompute(); // kick off the first computation
}

const root = document.getElementById("app");
if (root) mount(root);
