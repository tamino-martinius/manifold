import "../../styles/manifold/styles.css";
import "./toothpicks.css";
import { el } from "../../shared/dom";
import { icon } from "../../shared/icons";
import { initTheme } from "../../shared/theme";
import { themeToggle } from "../../shared/theme-toggle";
import { createAnimator } from "./animation";
import { easeScale, fitFromExtent } from "./camera";
import { createToothpickEngine } from "./engine";
import { type ResourceLink, TOOTHPICK_LINKS } from "./links";
import { mountPanel } from "./panel/panel";
import { renderToothpicks, revealSlices } from "./renderer";
import { type ToothpickState, createToothpickStore } from "./state";
import type { PlacedData } from "./types";

// Higher = snappier zoom easing (per-second exponential rate).
const ZOOM_SMOOTH_RATE = 8;
// Generations revealed per second at speed 30. The rate accelerates with the
// current stage — `GEN_RATE_BASE + frame * GEN_ACCEL` — so the reveal keeps a
// roughly constant on-screen pace as the structure (and the zoom-out) grows;
// otherwise late stages appear to crawl.
const GEN_RATE_BASE = 2;
const GEN_ACCEL = 0.12;

function linkItem(link: ResourceLink): HTMLElement {
  return el(
    "a",
    {
      className: `tp-link tp-link--${link.kind}`,
      href: link.url,
      target: "_blank",
      rel: "noopener noreferrer",
      title: link.title,
    },
    [
      icon(link.kind === "video" ? "youtube" : "hash", 16),
      el("span", { className: "tp-link-text" }, [
        el("span", { className: "tp-link-title" }, [link.title]),
        el("span", { className: "ds-label tp-link-label" }, [link.label]),
      ]),
    ],
  );
}

function linkDropdown(label: string, links: ResourceLink[]): HTMLElement {
  const menu = el("div", { className: "tp-dd-menu" });
  for (const l of links) menu.append(linkItem(l));
  const trigger = el("button", { type: "button", className: "tp-dd-trigger" }, [
    el("span", {}, [label]),
    icon("chevron-down", 13),
  ]);
  const wrap = el("div", { className: "tp-dd" }, [trigger]);

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
  const brand = el("a", { className: "tp-brand", href: "../", title: "Back to atlas" }, [
    el("span", { className: "tp-wordmark" }, ["manifold"]),
  ]);
  const right = el("div", { className: "tp-toolbar-right" });
  const videos = TOOTHPICK_LINKS.filter((l) => l.kind === "video");
  const refs = TOOTHPICK_LINKS.filter((l) => l.kind === "oeis");
  if (videos.length > 0) right.append(linkDropdown("Videos", videos));
  if (refs.length > 0) right.append(linkDropdown("OEIS", refs));
  right.append(themeToggle("tp-icon-btn tp-icon-btn--secondary"));

  return el("header", { className: "tp-toolbar" }, [
    el("div", { className: "tp-toolbar-left" }, [
      brand,
      el("span", { className: "tp-crumb ds-label" }, ["/ toothpick patterns"]),
    ]),
    right,
  ]);
}

function mount(root: HTMLElement): void {
  initTheme();
  const canvas = el("canvas") as HTMLCanvasElement;
  const wrap = el("div", { className: "tp-canvas-wrap ds-dot-bg" }, [canvas]);
  const panelEl = el("aside", { className: "tp-panel" });
  root.append(
    el("div", { className: "tp-studio" }, [
      toolbar(),
      el("div", { className: "tp-body" }, [wrap, panelEl]),
    ]),
  );

  const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
  const store = createToothpickStore();
  const engine = createToothpickEngine(store);

  const resize = () => {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(wrap.clientWidth * dpr);
    canvas.height = Math.floor(wrap.clientHeight * dpr);
  };
  resize();
  window.addEventListener("resize", resize);

  const bar = el("div", { className: "tp-loading-bar" });
  const overlay = el("div", { className: "tp-loading" }, [
    el("span", { className: "ds-label" }, ["computing toothpicks"]),
    el("div", { className: "tp-loading-track" }, [bar]),
  ]);
  wrap.append(overlay);
  const syncOverlay = (s: ToothpickState) => {
    overlay.classList.toggle("is-visible", s.loading);
    bar.style.width = `${Math.round(s.progress * 100)}%`;
  };
  store.subscribe(syncOverlay);
  syncOverlay(store.get());

  // Incrementally tracked half-extent of the revealed segments (cheap at scale).
  let displayScale = 0;
  let lastT = 0;
  let viewHalfX = 0;
  let viewHalfY = 0;
  let scannedSeg = 0;
  let lastShown = 0;
  let lastPlaced: PlacedData | null = null;
  let drawGen = -1;
  let drawScale = -1;
  let drawW = -1;
  let drawH = -1;
  let drawPlaced: PlacedData | null = null;

  const render = () => {
    const s = store.get();
    const placed = s.placed;
    if (placed !== lastPlaced) {
      lastPlaced = placed;
      viewHalfX = viewHalfY = scannedSeg = lastShown = 0;
    }
    const slices = revealSlices(placed.genSegEnds, s.frame);
    const shown = slices.outlineEnd;
    if (shown < lastShown) {
      viewHalfX = viewHalfY = scannedSeg = 0;
    }
    while (scannedSeg < shown) {
      const i = scannedSeg;
      const ax = Math.max(Math.abs(placed.x1[i]), Math.abs(placed.x2[i]));
      const ay = Math.max(Math.abs(placed.y1[i]), Math.abs(placed.y2[i]));
      if (ax > viewHalfX) viewHalfX = ax;
      if (ay > viewHalfY) viewHalfY = ay;
      scannedSeg++;
    }
    lastShown = shown;

    const target = fitFromExtent(viewHalfX, viewHalfY, canvas.width, canvas.height, 3);
    const now = performance.now();
    const dt = lastT === 0 ? 0 : (now - lastT) / 1000;
    lastT = now;
    displayScale = easeScale(displayScale, target.scale, dt, ZOOM_SMOOTH_RATE);

    const gen = Math.floor(s.frame);
    const dirty =
      gen !== drawGen ||
      Math.abs(displayScale - drawScale) > 1e-3 ||
      canvas.width !== drawW ||
      canvas.height !== drawH ||
      placed !== drawPlaced;
    if (!dirty) return;
    drawGen = gen;
    drawScale = displayScale;
    drawW = canvas.width;
    drawH = canvas.height;
    drawPlaced = placed;

    renderToothpicks(
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
      const G = s.placed.genSegEnds.length;
      if (G <= 0) return; // still computing
      if (s.frame >= G) {
        store.set({ playing: false }); // reached the last generation → stops
        return;
      }
      const rate = GEN_RATE_BASE + s.frame * GEN_ACCEL;
      const next = s.frame + (s.speed / 30) * rate * Math.min(dt, 0.1);
      store.set({ frame: Math.min(next, G) });
    },
    render,
  });
  animator.start();

  engine.recompute(); // kick off the first computation
}

const root = document.getElementById("app");
if (root) mount(root);
