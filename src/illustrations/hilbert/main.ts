import "../../styles/manifold/styles.css";
import "../chessboard/chessboard.css";
import "./hilbert.css";
import { el } from "../../shared/dom";
import { pageFooter } from "../../shared/footer";
import { icon } from "../../shared/icons";
import { initTheme } from "../../shared/theme";
import { themeToggle } from "../../shared/theme-toggle";
import { createAnimator } from "../chessboard/animation";
import { anchoredCamera, easeScale, fitAnchoredScale } from "./camera";
import { type HilbertPath, hilbertPath } from "./hilbert";
import { HILBERT_LINKS, type ResourceLink } from "./links";
import { mountPanel } from "./panel/panel";
import { renderCurve } from "./renderer";
import { createHilbertStore } from "./state";

// Higher = snappier zoom easing when the order (and thus the fit) changes.
const ZOOM_SMOOTH_RATE = 8;
// Relative (accelerating) reveal: starts slow so the early path is watchable,
// then races as more is drawn so the largest orders still finish quickly.
const BASE_RATE = 10; // points/sec near the start
const GROWTH_RATE = 1.2; // + this fraction of the revealed count per second

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
  const videos = HILBERT_LINKS.filter((l) => l.kind === "video");
  const refs = HILBERT_LINKS.filter((l) => l.kind === "oeis");
  if (videos.length > 0) right.append(linkDropdown("Videos", videos));
  if (refs.length > 0) right.append(linkDropdown("OEIS", refs));
  right.append(themeToggle("cb-icon-btn cb-icon-btn--secondary"));

  return el("header", { className: "cb-toolbar" }, [
    el("div", { className: "cb-toolbar-left" }, [
      brand,
      el("span", { className: "cb-crumb ds-label" }, ["/ hilbert curve"]),
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
  const store = createHilbertStore();

  const resize = () => {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(wrap.clientWidth * dpr);
    canvas.height = Math.floor(wrap.clientHeight * dpr);
  };
  resize();
  window.addEventListener("resize", resize);

  let displayScale = 0;
  let lastT = 0;
  // Incrementally tracked extent of the *revealed* path (max cell x/y), so the
  // auto-fit never rescans the array even at 262k points.
  let viewMaxX = 0;
  let viewMaxY = 0;
  let scannedTo = 0;
  let lastPath: HilbertPath | null = null;
  // Dirty-flag: skip the redraw when nothing visible changed.
  let drawFrame = -1;
  let drawScale = -1;
  let drawW = -1;
  let drawH = -1;
  let drawK = -1;
  let drawColor = "";

  const render = () => {
    const s = store.get();
    const path = hilbertPath(s.k); // memoized — regenerates only on a new order

    // Track the revealed extent: reset on a new order or when scrubbed back,
    // then scan only the newly-revealed points.
    if (path !== lastPath) {
      lastPath = path;
      viewMaxX = viewMaxY = scannedTo = 0;
    }
    const count = Math.min(Math.floor(s.frame), path.n);
    if (count < scannedTo) viewMaxX = viewMaxY = scannedTo = 0;
    for (let i = scannedTo; i < count; i++) {
      if (path.xs[i] > viewMaxX) viewMaxX = path.xs[i];
      if (path.ys[i] > viewMaxY) viewMaxY = path.ys[i];
    }
    scannedTo = count;

    const targetScale = fitAnchoredScale(viewMaxX, viewMaxY, canvas.width, canvas.height);
    const now = performance.now();
    const dt = lastT === 0 ? 0 : (now - lastT) / 1000;
    lastT = now;
    displayScale = easeScale(displayScale, targetScale, dt, ZOOM_SMOOTH_RATE);

    const dirty =
      count !== drawFrame ||
      Math.abs(displayScale - drawScale) > 1e-4 ||
      canvas.width !== drawW ||
      canvas.height !== drawH ||
      s.k !== drawK ||
      s.colorMode !== drawColor;
    if (!dirty) return;
    drawFrame = count;
    drawScale = displayScale;
    drawW = canvas.width;
    drawH = canvas.height;
    drawK = s.k;
    drawColor = s.colorMode;

    // Pin the path's bottom-left start point to a static screen anchor; offsets
    // are recomputed at the eased scale so it stays put while the zoom settles.
    const cam = anchoredCamera(displayScale, canvas.width, canvas.height);
    renderCurve(ctx, cam, path, s.frame, s.colorMode, canvas.width, canvas.height);
  };

  // Pre-warm the path for the new order so the first post-change frame is instant.
  mountPanel(panelEl, store, () => hilbertPath(store.get().k));

  const animator = createAnimator({
    isPlaying: () => store.get().playing,
    onTick: (dt) => {
      const s = store.get();
      const max = 4 ** s.k;
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
}

const root = document.getElementById("app");
if (root) mount(root);
