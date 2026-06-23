import "../../styles/manifold/styles.css";
import "../chessboard/chessboard.css";
import "./ford-circles.css";
import { el } from "../../shared/dom";
import { pageFooter } from "../../shared/footer";
import { icon } from "../../shared/icons";
import { initTheme } from "../../shared/theme";
import { themeToggle } from "../../shared/theme-toggle";
import { createAnimator } from "../chessboard/animation";
import { type Camera, easeScale, fitInterval, screenToWorld } from "./camera";
import { fordCircles } from "./farey";
import { FORD_LINKS, type ResourceLink } from "./links";
import { mountPanel } from "./panel/panel";
import { renderFord } from "./renderer";
import { createFordStore } from "./state";

const ZOOM_RATE = 8; // per-second exponential easing of the camera scale
const MIN_SCALE = 2;
const MAX_SCALE = 1e9;
const RECOMPUTE_MS = 120;

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

// ---- Toolbar link dropdowns (copied from chessboard/main.ts) -------------------
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
  const videos = FORD_LINKS.filter((l) => l.kind === "video");
  const refs = FORD_LINKS.filter((l) => l.kind === "oeis");
  if (videos.length > 0) right.append(linkDropdown("Videos", videos));
  if (refs.length > 0) right.append(linkDropdown("OEIS", refs));
  right.append(themeToggle("cb-icon-btn cb-icon-btn--secondary"));

  return el("header", { className: "cb-toolbar" }, [
    el("div", { className: "cb-toolbar-left" }, [
      brand,
      el("span", { className: "cb-crumb ds-label" }, ["/ ford circles"]),
    ]),
    right,
  ]);
}

// ---- Studio --------------------------------------------------------------------
function mount(root: HTMLElement): void {
  initTheme();
  const canvas = el("canvas", { className: "fc-canvas" }) as HTMLCanvasElement;
  const wrap = el("div", { className: "cb-canvas-wrap ds-dot-bg" }, [canvas]);
  const hint = el("div", { className: "fc-hint" }, [
    el("span", { className: "ds-label" }, ["increase order n to reveal more"]),
  ]);
  wrap.append(hint);
  const panelEl = el("aside", { className: "cb-panel" });
  root.append(
    el("div", { className: "cb-studio" }, [
      toolbar(),
      el("div", { className: "cb-body" }, [wrap, panelEl]),
      pageFooter(),
    ]),
  );

  const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
  const store = createFordStore();

  const resize = (): void => {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(wrap.clientWidth * dpr);
    canvas.height = Math.floor(wrap.clientHeight * dpr);
    reframe();
  };

  // ---- Equal-scale camera via an anchor: world (anchorW) ↔ screen (anchorS). ----
  // Easing only the scale toward `targetScale` zooms toward the anchor, and the
  // offsets are derived each frame so circles stay round and the cursor stays put.
  let targetScale = 1;
  let initialScale = 1;
  let displayScale = 0; // 0 = snap sentinel
  let anchorWX = 0;
  let anchorWY = 0;
  let anchorSX = 0;
  let anchorSY = 0;
  let lastT = 0;

  const padDev = (): number => Math.round(28 * (window.devicePixelRatio || 1));

  function reframe(): void {
    const w = canvas.width;
    const h = canvas.height;
    const pad = padDev();
    const s = store.get();
    const maxR = s.circles.length > 0 ? s.circles[0].r : 0.5;
    const yMax = 2 * maxR; // reserve room for the TOP of the tallest circle
    const fit = fitInterval(s.intervalA, s.intervalB, yMax, w, h, pad);
    targetScale = clamp(fit.scale, MIN_SCALE, MAX_SCALE);
    initialScale = targetScale;
    // Center the interval horizontally when the fit leaves slack; else pin to pad.
    const usedW = (s.intervalB - s.intervalA) * targetScale;
    anchorWX = s.intervalA;
    anchorSX = Math.max(pad, (w - usedW) / 2);
    anchorWY = 0;
    anchorSY = h - pad;
    displayScale = 0; // snap on the next frame
  }

  function camNow(): Camera {
    return {
      scale: displayScale,
      offsetX: anchorSX - anchorWX * displayScale,
      offsetY: anchorSY + anchorWY * displayScale,
    };
  }

  // ---- Recompute the circle set on structural change (debounced) ----------------
  let lastA = Number.NaN;
  let lastB = Number.NaN;
  function doRecompute(): void {
    const s = store.get();
    const circles = fordCircles(s.order, s.intervalA, s.intervalB);
    store.set({ circles, frame: Math.min(s.frame, s.order) });
    if (s.intervalA !== lastA || s.intervalB !== lastB) {
      lastA = s.intervalA;
      lastB = s.intervalB;
      reframe();
    }
  }
  let recomputeTimer = 0;
  function scheduleRecompute(): void {
    window.clearTimeout(recomputeTimer);
    recomputeTimer = window.setTimeout(doRecompute, RECOMPUTE_MS);
  }

  // ---- Wheel zoom (toward cursor) + drag pan ------------------------------------
  canvas.addEventListener(
    "wheel",
    (e: WheelEvent) => {
      e.preventDefault();
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      const mx = (e.clientX - rect.left) * dpr;
      const my = (e.clientY - rect.top) * dpr;
      // Re-anchor on the world point currently under the cursor (no visible jump),
      // then change the target scale; easing zooms toward that point.
      const { wx, wy } = screenToWorld(camNow(), mx, my);
      anchorWX = wx;
      anchorWY = wy;
      anchorSX = mx;
      anchorSY = my;
      targetScale = clamp(targetScale * Math.exp(-e.deltaY * 0.0015), MIN_SCALE, MAX_SCALE);
    },
    { passive: false },
  );

  let dragging = false;
  let lastMX = 0;
  let lastMY = 0;
  canvas.addEventListener("pointerdown", (e: PointerEvent) => {
    dragging = true;
    lastMX = e.clientX;
    lastMY = e.clientY;
    canvas.setPointerCapture(e.pointerId);
    canvas.classList.add("is-grabbing");
  });
  canvas.addEventListener("pointermove", (e: PointerEvent) => {
    if (!dragging) return;
    const dpr = window.devicePixelRatio || 1;
    anchorSX += (e.clientX - lastMX) * dpr;
    anchorSY += (e.clientY - lastMY) * dpr;
    lastMX = e.clientX;
    lastMY = e.clientY;
  });
  const endDrag = (e: PointerEvent): void => {
    if (!dragging) return;
    dragging = false;
    canvas.releasePointerCapture(e.pointerId);
    canvas.classList.remove("is-grabbing");
  };
  canvas.addEventListener("pointerup", endDrag);
  canvas.addEventListener("pointercancel", endDrag);

  // ---- Render (dirty-guarded) ---------------------------------------------------
  let dFrame = -1;
  let dScale = -1;
  let dOffX = Number.NaN;
  let dOffY = Number.NaN;
  let dW = -1;
  let dH = -1;
  let dColor = "";
  let dFill = "";
  let dCircles: unknown = null;

  const render = (): void => {
    const now = performance.now();
    const dt = lastT === 0 ? 0 : (now - lastT) / 1000;
    lastT = now;
    displayScale = easeScale(displayScale, targetScale, dt, ZOOM_RATE);
    if (Math.abs(displayScale - targetScale) < targetScale * 1e-4) displayScale = targetScale;

    const s = store.get();
    const cam = camNow();
    const nEff = Math.min(s.frame, s.order);

    const dirty =
      s.frame !== dFrame ||
      displayScale !== dScale ||
      cam.offsetX !== dOffX ||
      cam.offsetY !== dOffY ||
      canvas.width !== dW ||
      canvas.height !== dH ||
      s.colorMode !== dColor ||
      s.fillMode !== dFill ||
      s.circles !== dCircles;
    if (!dirty) return;
    dFrame = s.frame;
    dScale = displayScale;
    dOffX = cam.offsetX;
    dOffY = cam.offsetY;
    dW = canvas.width;
    dH = canvas.height;
    dColor = s.colorMode;
    dFill = s.fillMode;
    dCircles = s.circles;

    renderFord(ctx, cam, s.circles, nEff, s.colorMode, s.fillMode, canvas.width, canvas.height);

    // Hint: zoomed in past what the current order can resolve (more, smaller
    // circles would be visible if n were higher).
    const qVisible = Math.sqrt(displayScale / 0.6);
    const zoomedIn = displayScale > initialScale * 1.3;
    hint.classList.toggle("is-visible", zoomedIn && qVisible > s.order);
  };

  mountPanel(panelEl, store, scheduleRecompute);
  resize();
  window.addEventListener("resize", resize);
  doRecompute(); // initial synchronous compute + reframe

  createAnimator({
    isPlaying: () => store.get().playing,
    onTick: (dt) => {
      const s = store.get();
      if (s.frame >= s.order) {
        if (s.playing) store.set({ playing: false }); // reached the end → "Replay"
        return;
      }
      store.set({ frame: Math.min(s.frame + s.speed * Math.min(dt, 0.1), s.order) });
    },
    render,
  }).start();
}

const root = document.getElementById("app");
if (root) mount(root);
