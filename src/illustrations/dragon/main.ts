import "../../styles/manifold/styles.css";
// Reuse the chessboard chrome (toolbar/panel/control styling) verbatim.
import "../chessboard/chessboard.css";
import "./dragon.css";
import { el } from "../../shared/dom";
import { pageFooter } from "../../shared/footer";
import { icon } from "../../shared/icons";
import { initTheme, onThemeChange } from "../../shared/theme";
import { themeToggle } from "../../shared/theme-toggle";
import { createAnimator } from "../chessboard/animation";
import { type Camera, type Framing, easeScale, framePrefix } from "./camera";
import { type DragonGeom, generateDragon } from "./dragon";
import { DRAGON_LINKS, type ResourceLink } from "./links";
import { mountPanel } from "./panel/panel";
import { readDragonPalette, renderDragon } from "./renderer";
import { type DragonState, MORPH_MAX_ORDER, createDragonStore } from "./state";

const DEG = Math.PI / 180;
const CAM_SMOOTH_RATE = 8; // exponential easing rate for zoom + pan
const LINE_WIDTH_CSS = 1.5; // device px = this × dpr
const FIT_MARGIN = 0.08; // breathing room as a fraction of the fit radius
// onTick advance rates (per second, per unit of the speed slider).
const ITER_RATE = 0.15; // orders k / s
const FOLD_RATE = 2.5; // degrees / s

// Frame-rate-independent exponential easing toward a target (no snap sentinel —
// used for camera pan, where the target may legitimately be 0 or negative).
function approach(current: number, target: number, dt: number, rate: number): number {
  return current + (target - current) * (1 - Math.exp(-rate * Math.min(Math.max(dt, 0), 0.1)));
}

// ---- Toolbar (link dropdowns ported from chessboard/main.ts) ----

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
    // Portal to <body> so the menu isn't clipped behind the canvas by the
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
  const videos = DRAGON_LINKS.filter((l) => l.kind === "video");
  const refs = DRAGON_LINKS.filter((l) => l.kind === "oeis");
  if (videos.length > 0) right.append(linkDropdown("Videos", videos));
  if (refs.length > 0) right.append(linkDropdown("OEIS", refs));
  right.append(themeToggle("cb-icon-btn cb-icon-btn--secondary"));

  return el("header", { className: "cb-toolbar" }, [
    el("div", { className: "cb-toolbar-left" }, [
      brand,
      el("span", { className: "cb-crumb ds-label" }, ["/ dragon curve"]),
    ]),
    right,
  ]);
}

// ---- Studio ----

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
  const store = createDragonStore();

  let dpr = window.devicePixelRatio || 1;
  const resize = (): void => {
    dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(wrap.clientWidth * dpr);
    canvas.height = Math.floor(wrap.clientHeight * dpr);
  };
  resize();
  window.addEventListener("resize", resize);

  // Force one redraw with a fresh palette when the theme flips.
  let themeTick = 0;
  onThemeChange(() => {
    themeTick++;
  });

  // ---- Geometry: build the curve once at the full order; the iteration
  // animation reveals a growing PREFIX of it. Because the paper-folding turns
  // are order-independent, the first 2^frame segments are exactly the lower
  // order dragon (integer frame) or a partially-unfurled next level (fractional
  // frame) — so curve growth and zoom stay continuous, with no per-step snap.
  // The (up to 4 MB) buffer is kept local, never routed through the store. ----
  const buildParams = (s: DragonState): { order: number; theta: number } => {
    const order = s.animateMode === "iteration" ? s.order : Math.min(s.order, MORPH_MAX_ORDER);
    return { order, theta: s.foldAngle * DEG };
  };
  let geom: DragonGeom = generateDragon(1, Math.PI / 2);
  let builtOrder = -1;
  let builtTheta = Number.NaN;
  const ensureGeom = (s: DragonState): DragonGeom => {
    const { order, theta } = buildParams(s);
    if (order !== builtOrder || Math.abs(theta - builtTheta) > 1e-9) {
      geom = generateDragon(order, theta);
      builtOrder = order;
      builtTheta = theta;
    }
    return geom;
  };

  // Segments revealed this frame: iteration grows them as 2^frame (clamped);
  // the fold morph always shows the whole curve.
  const visibleSegments = (s: DragonState, count: number): number => {
    if (s.animateMode !== "iteration") return count;
    return Math.min(Math.max(Math.round(2 ** s.frame), 1), count);
  };

  // ---- Render (continuous eased zoom + pan, dirty-guarded) ----
  let displayScale = 0;
  let camX = 0;
  let camY = 0;
  let camReady = false;
  let lastT = 0;
  let lastFrame = Number.NaN;
  let lastMode: DragonState["animateMode"] | "" = "";
  // Framing is memoised on (order, θ, nseg) so paused/at-rest frames stay cheap.
  let framing: Framing = framePrefix(geom.points, geom.count);
  let framedNseg = -1;
  let framedOrder = -1;
  let framedTheta = Number.NaN;
  let drawScale = -1;
  let drawOffX = Number.NaN;
  let drawOffY = Number.NaN;
  let drawW = -1;
  let drawH = -1;
  let drawSig = "";

  const render = (): void => {
    const s = store.get();
    const g = ensureGeom(s);
    const nseg = visibleSegments(s, g.count);

    if (nseg !== framedNseg || builtOrder !== framedOrder || builtTheta !== framedTheta) {
      framing = framePrefix(g.points, nseg);
      framedNseg = nseg;
      framedOrder = builtOrder;
      framedTheta = builtTheta;
    }

    // Rotation-stable fit: centre + circumradius (origin for the symmetric
    // 4-copy tiling).
    const targetX = s.tiling ? 0 : framing.cx;
    const targetY = s.tiling ? 0 : framing.cy;
    const radius = Math.max(s.tiling ? framing.rTiling : framing.rSingle, 1e-6);
    const targetScale = Math.min(canvas.width, canvas.height) / (2 * radius * (1 + FIT_MARGIN));

    const now = performance.now();
    const dt = lastT === 0 ? 0 : (now - lastT) / 1000;
    lastT = now;
    // Snap (don't ease) on the first frame, on rewind/replay, or on a mode
    // switch — those are deliberate jumps, not motion to animate. The fold
    // morph snaps EVERY frame: its extent swings ~75× and its centroid spirals
    // as the paper unfolds, so easing the fit would read as a jarring zoom/pan.
    // Snapping holds the figure at a constant on-screen size, centred, folding
    // in place — no auto-zoom.
    const jump =
      !camReady ||
      s.animateMode === "fold" ||
      s.animateMode !== lastMode ||
      (!Number.isNaN(lastFrame) && s.frame < lastFrame - 1e-6);
    lastFrame = s.frame;
    lastMode = s.animateMode;
    if (jump) {
      displayScale = targetScale;
      camX = targetX;
      camY = targetY;
      camReady = true;
    } else {
      displayScale = easeScale(displayScale, targetScale, dt, CAM_SMOOTH_RATE);
      camX = approach(camX, targetX, dt, CAM_SMOOTH_RATE);
      camY = approach(camY, targetY, dt, CAM_SMOOTH_RATE);
    }

    // Offsets depend on scale + eased centre, so re-derive them each frame.
    const cam: Camera = {
      scale: displayScale,
      offsetX: canvas.width / 2 - camX * displayScale,
      offsetY: canvas.height / 2 + camY * displayScale,
    };

    const sig = `${s.colorMode}|${s.tiling}|${builtOrder}|${builtTheta}|${nseg}|${themeTick}`;
    const dirty =
      sig !== drawSig ||
      Math.abs(displayScale - drawScale) > 1e-3 ||
      Math.abs(cam.offsetX - drawOffX) > 0.25 ||
      Math.abs(cam.offsetY - drawOffY) > 0.25 ||
      canvas.width !== drawW ||
      canvas.height !== drawH;
    if (!dirty) return;
    drawSig = sig;
    drawScale = displayScale;
    drawOffX = cam.offsetX;
    drawOffY = cam.offsetY;
    drawW = canvas.width;
    drawH = canvas.height;

    const palette = readDragonPalette();
    renderDragon(
      ctx,
      cam,
      g,
      {
        colorMode: s.colorMode,
        tiling: s.tiling,
        accent: palette.accent,
        hues: palette.hues,
        ramp: palette.ramp,
        hueRamps: palette.hueRamps,
        lineWidth: LINE_WIDTH_CSS * dpr,
        limit: nseg,
      },
      canvas.width,
      canvas.height,
    );
  };

  mountPanel(panelEl, store);

  const animator = createAnimator({
    isPlaying: () => store.get().playing,
    onTick: (dt) => {
      const s = store.get();
      const step = Math.min(dt, 0.1) * s.speed;
      if (s.animateMode === "iteration") {
        if (s.frame >= s.order) {
          store.set({ playing: false });
          return;
        }
        store.set({ frame: Math.min(s.frame + step * ITER_RATE, s.order) });
      } else {
        if (s.foldAngle >= 90) {
          store.set({ playing: false });
          return;
        }
        store.set({ foldAngle: Math.min(s.foldAngle + step * FOLD_RATE, 90) });
      }
    },
    render,
  });
  animator.start();
}

const root = document.getElementById("app");
if (root) mount(root);
