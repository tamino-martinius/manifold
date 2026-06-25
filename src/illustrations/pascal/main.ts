import "../../styles/manifold/styles.css";
// Reuse the chessboard studio chrome (toolbar / panel / dropdown styles) verbatim
// so the atlas reads as one product, then layer the few Pascal-specific bits.
import "../chessboard/chessboard.css";
import "./pascal.css";
import { el } from "../../shared/dom";
import { pageFooter } from "../../shared/footer";
import { icon } from "../../shared/icons";
import { initTheme, onThemeChange } from "../../shared/theme";
import { themeToggle } from "../../shared/theme-toggle";
import { createAnimator } from "../chessboard/animation";
import { easeScale, fitBounds } from "./camera";
import { readThemeColors } from "./colors";
import { PASCAL_LINKS, type ResourceLink } from "./links";
import { mountPanel } from "./panel/panel";
import { type PascalResidues, buildResidues, isPrime } from "./pascal";
import { renderPascal } from "./renderer";
import { type PascalState, createPascalStore } from "./state";

// Higher = snappier zoom easing (per-second exponential rate), shared with the
// chessboard so the whole atlas zooms with the same feel.
const ZOOM_SMOOTH_RATE = 8;
// World-units of breathing room around the figure; also how far the apex sits
// below the top edge (offsetY = PADDING * scale).
const PADDING = 3;
// Interactive-zoom limits, in device px per cell (the camera scale).
const MIN_SCALE = 0.02;
const MAX_SCALE = 260;

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
// toolbar's backdrop-filter stacking context; closes on outside-click / scroll).
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
  const videos = PASCAL_LINKS.filter((l) => l.kind === "video");
  const refs = PASCAL_LINKS.filter((l) => l.kind === "oeis");
  if (videos.length > 0) right.append(linkDropdown("Videos", videos));
  if (refs.length > 0) right.append(linkDropdown("OEIS", refs));
  right.append(themeToggle("cb-icon-btn cb-icon-btn--secondary"));

  return el("header", { className: "cb-toolbar" }, [
    el("div", { className: "cb-toolbar-left" }, [
      brand,
      el("span", { className: "cb-crumb ds-label" }, ["/ pascal mod n"]),
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
  const store = createPascalStore();

  const resize = () => {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(wrap.clientWidth * dpr);
    canvas.height = Math.floor(wrap.clientHeight * dpr);
  };
  resize();
  window.addEventListener("resize", resize);

  // Theme-reactive colors; bump an epoch to force one redraw past the dirty guard.
  let colors = readThemeColors();
  let colorEpoch = 0;
  onThemeChange(() => {
    colors = readThemeColors();
    colorEpoch++;
  });

  // Lazy residue cache for COMPOSITE m, rebuilt only when (m, rows) require it.
  // Prime m uses lucasMod per visible cell (no cache). Coalesces to ≤ one rebuild
  // per (m, rows) change, evaluated at draw time.
  let residuesCache: PascalResidues | null = null;
  const residuesFor = (s: PascalState): PascalResidues | null => {
    if (isPrime(s.m)) return null;
    if (!residuesCache || residuesCache.m !== s.m || residuesCache.rows < s.rows) {
      residuesCache = buildResidues(s.rows, s.m);
    }
    return residuesCache;
  };

  let displayScale = 0; // eased auto-fit scale (auto mode)
  let lastT = 0;
  // User-driven camera, active once they scroll/drag; double-click restores the
  // auto-fit reveal framing. Seeded from the current auto camera so taking over
  // never jumps.
  let manual = false;
  let manScale = 0;
  let manX = 0;
  let manY = 0;
  const seedManual = (): void => {
    const s = store.get();
    const shownRows = Math.min(Math.floor(s.frame), s.rows);
    const t = fitBounds(Math.max(1, shownRows), canvas.width, canvas.height, PADDING);
    manScale = displayScale > 0 ? displayScale : t.scale;
    manX = t.offsetX;
    manY = PADDING * manScale;
    manual = true;
  };

  // Dirty-flag: skip the redraw when nothing visible changed.
  let drawFrame = -1;
  let drawScale = -1;
  let drawOffX = Number.NaN;
  let drawOffY = Number.NaN;
  let drawW = -1;
  let drawH = -1;
  let drawM = -1;
  let drawRows = -1;
  let drawMode = "";
  let drawEpoch = -1;

  const render = () => {
    const s = store.get();
    const shownRows = Math.min(Math.floor(s.frame), s.rows);
    const now = performance.now();
    const dt = lastT === 0 ? 0 : (now - lastT) / 1000;
    lastT = now;

    // Manual camera takes over once the user zooms/pans; otherwise ease toward
    // the auto-fit framing of the revealed rows (apex pinned near the top, with
    // offsetY recomputed from the eased scale).
    let cam: { scale: number; offsetX: number; offsetY: number };
    if (manual) {
      cam = { scale: manScale, offsetX: manX, offsetY: manY };
    } else {
      const target = fitBounds(Math.max(1, shownRows), canvas.width, canvas.height, PADDING);
      displayScale = easeScale(displayScale, target.scale, dt, ZOOM_SMOOTH_RATE);
      cam = { scale: displayScale, offsetX: target.offsetX, offsetY: PADDING * displayScale };
    }

    const dirty =
      shownRows !== drawFrame ||
      Math.abs(cam.scale - drawScale) > 1e-3 ||
      cam.offsetX !== drawOffX ||
      cam.offsetY !== drawOffY ||
      canvas.width !== drawW ||
      canvas.height !== drawH ||
      s.m !== drawM ||
      s.rows !== drawRows ||
      s.colorMode !== drawMode ||
      colorEpoch !== drawEpoch;
    if (!dirty) return;
    drawFrame = shownRows;
    drawScale = cam.scale;
    drawOffX = cam.offsetX;
    drawOffY = cam.offsetY;
    drawW = canvas.width;
    drawH = canvas.height;
    drawM = s.m;
    drawRows = s.rows;
    drawMode = s.colorMode;
    drawEpoch = colorEpoch;

    renderPascal(
      ctx,
      cam,
      {
        m: s.m,
        colorMode: s.colorMode,
        residues: residuesFor(s),
        colors,
      },
      shownRows,
      canvas.width,
      canvas.height,
    );
  };

  // --- Interactive zoom + pan, decoupled from the auto-fit reveal so you can
  // zoom in to read residue numbers and inspect detail deep in the triangle.
  // Wheel zooms toward the cursor; drag pans; double-click restores auto-fit.
  canvas.addEventListener(
    "wheel",
    (e: WheelEvent) => {
      e.preventDefault();
      if (!manual) seedManual();
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const px = (e.clientX - rect.left) * dpr;
      const py = (e.clientY - rect.top) * dpr;
      const next = Math.min(
        MAX_SCALE,
        Math.max(MIN_SCALE, manScale * Math.exp(-e.deltaY * 0.0015)),
      );
      // Keep the world point under the cursor fixed while the scale changes.
      const wx = (px - manX) / manScale;
      const wy = (py - manY) / manScale;
      manScale = next;
      manX = px - wx * next;
      manY = py - wy * next;
    },
    { passive: false },
  );

  let dragging = false;
  let dragX = 0;
  let dragY = 0;
  canvas.addEventListener("pointerdown", (e: PointerEvent) => {
    dragging = true;
    dragX = e.clientX;
    dragY = e.clientY;
    canvas.setPointerCapture(e.pointerId);
    canvas.style.cursor = "grabbing";
  });
  canvas.addEventListener("pointermove", (e: PointerEvent) => {
    if (!dragging) return;
    const dpr = window.devicePixelRatio || 1;
    const dx = (e.clientX - dragX) * dpr;
    const dy = (e.clientY - dragY) * dpr;
    dragX = e.clientX;
    dragY = e.clientY;
    if (dx === 0 && dy === 0) return;
    if (!manual) seedManual();
    manX += dx;
    manY += dy;
  });
  const endDrag = (e: PointerEvent): void => {
    if (!dragging) return;
    dragging = false;
    if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
    canvas.style.cursor = "grab";
  };
  canvas.addEventListener("pointerup", endDrag);
  canvas.addEventListener("pointercancel", endDrag);
  // Back to the auto-fit reveal framing (snap re-fit next frame), shared by the
  // double-click gesture and the panel's "Replay" button.
  const resetCamera = (): void => {
    manual = false;
    displayScale = 0;
  };
  canvas.addEventListener("dblclick", resetCamera);
  canvas.style.cursor = "grab";

  // Replay restarts the reveal from the top; drop any manual zoom so it re-runs
  // the initial auto-fit animation (zoom in on the apex, zoom out as rows reveal).
  mountPanel(panelEl, store, resetCamera);

  const animator = createAnimator({
    isPlaying: () => store.get().playing,
    onTick: (dt) => {
      const s = store.get();
      if (s.rows <= 0) return;
      if (s.frame >= s.rows) {
        store.set({ playing: false }); // reached the end → button shows "Replay"
        return;
      }
      const next = s.frame + s.speed * Math.min(dt, 0.1);
      store.set({ frame: Math.min(next, s.rows) });
    },
    render,
  });
  animator.start();
}

const root = document.getElementById("app");
if (root) mount(root);
