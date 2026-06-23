import "../../styles/manifold/styles.css";
import "./recaman.css";
import { el } from "../../shared/dom";
import { icon } from "../../shared/icons";
import { initTheme } from "../../shared/theme";
import { themeToggle } from "../../shared/theme-toggle";
import { createAnimator } from "../chessboard/animation";
import { type Camera, easeScale, fitBounds } from "./camera";
import { RECAMAN_LINKS, type ResourceLink } from "./links";
import { mountPanel } from "./panel/panel";
import { type RecamanArcs, generateRecaman } from "./recaman";
import { renderRecaman } from "./renderer";
import { createRecamanStore } from "./state";

// Lower = gentler, smoother zoom/pan easing (per-second exponential rate).
const ZOOM_SMOOTH_RATE = 4;
// Fraction of the figure's extent kept as breathing room. Generous enough that
// the gently-lagging eased view never clips the largest arc as the figure grows.
const PADDING_FRACTION = 0.12;
// Minimum fitted span (world units). The first ~8 terms climb 0→1→3→6→2→7→13→20,
// so the extent changes enormously per term while the range is tiny; framing a
// stable window across that whole early climb (a(7)=20) keeps the opening calm.
// Past it, record maxima grow only a few percent at a time and ease smoothly.
const MIN_SPAN = 20;

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
  const videos = RECAMAN_LINKS.filter((l) => l.kind === "video");
  const refs = RECAMAN_LINKS.filter((l) => l.kind === "oeis");
  if (videos.length > 0) right.append(linkDropdown("Videos", videos));
  if (refs.length > 0) right.append(linkDropdown("OEIS", refs));
  right.append(themeToggle("cb-icon-btn cb-icon-btn--secondary"));

  return el("header", { className: "cb-toolbar" }, [
    el("div", { className: "cb-toolbar-left" }, [
      brand,
      el("span", { className: "cb-crumb ds-label" }, ["/ recamán's sequence"]),
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
    ]),
  );

  const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
  const store = createRecamanStore();

  const resize = () => {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(wrap.clientWidth * dpr);
    canvas.height = Math.floor(wrap.clientHeight * dpr);
  };
  resize();
  window.addEventListener("resize", resize);

  // Incrementally tracked right edge (max revealed value) so the auto-fit never
  // rebuilds an array; the tallest revealed arc is the closed form steps/2.
  let displayScale = 0;
  let displayCx = 0;
  let lastT = 0;
  let lineMax = 0;
  let scannedTo = 0;
  let lastArcs: RecamanArcs | null = null;
  // Dirty-flag: skip the redraw when nothing visible changed.
  let drawSteps = -1;
  let drawScale = -1;
  let drawOffsetX = Number.NaN;
  let drawW = -1;
  let drawH = -1;
  let drawArcs: RecamanArcs | null = null;
  let drawColor = "";
  let drawAlt = true;

  const render = () => {
    const s = store.get();
    const arcs = s.arcs;
    const total = arcs.starts.length;
    // Snap (don't ease) the camera on discontinuous changes — a new sequence, or
    // the timeline jumping backward (Replay / scrub-back) — so the start is framed
    // instantly instead of flying in from the previous zoomed-out end state.
    let snap = false;
    if (arcs !== lastArcs) {
      lastArcs = arcs;
      lineMax = 0;
      scannedTo = 0;
      snap = true;
    }
    const steps = Math.min(Math.floor(s.frame), total);
    if (steps < scannedTo) {
      lineMax = 0;
      scannedTo = 0;
      snap = true;
    }
    for (let i = scannedTo + 1; i <= steps; i++) {
      const v = arcs.values[i];
      if (v > lineMax) lineMax = v;
    }
    scannedTo = steps;

    const tallest = steps / 2;
    // Floor the fitted span so the first few terms sit inside a stable window
    // rather than forcing the camera to rescale hard while the range is tiny.
    const fitMax = Math.max(lineMax, MIN_SPAN);
    const fitTallest = Math.max(tallest, MIN_SPAN / 2);
    const targetCx = fitMax / 2;
    const pad = Math.max(1, Math.max(fitMax, 2 * fitTallest) * PADDING_FRACTION);
    const target = fitBounds(0, fitMax, fitTallest, canvas.width, canvas.height, pad);

    const now = performance.now();
    const dt = lastT === 0 ? 0 : (now - lastT) / 1000;
    lastT = now;
    // Ease BOTH the scale and the world center-x during forward playback.
    // Recamán's max value jumps the moment a new record term lands; easing the
    // center as well as the zoom means the figure pans smoothly instead of
    // lurching sideways on each jump.
    displayScale = snap
      ? target.scale
      : easeScale(displayScale, target.scale, dt, ZOOM_SMOOTH_RATE);
    displayCx = snap ? targetCx : easeScale(displayCx, targetCx, dt, ZOOM_SMOOTH_RATE);

    const offsetX = canvas.width / 2 - displayCx * displayScale;
    const offsetY = canvas.height / 2;

    const dirty =
      steps !== drawSteps ||
      Math.abs(displayScale - drawScale) > 1e-3 ||
      Math.abs(offsetX - drawOffsetX) > 0.25 ||
      canvas.width !== drawW ||
      canvas.height !== drawH ||
      arcs !== drawArcs ||
      s.colorMode !== drawColor ||
      s.alternate !== drawAlt;
    if (!dirty) return;
    drawSteps = steps;
    drawScale = displayScale;
    drawOffsetX = offsetX;
    drawW = canvas.width;
    drawH = canvas.height;
    drawArcs = arcs;
    drawColor = s.colorMode;
    drawAlt = s.alternate;

    const cam: Camera = { scale: displayScale, offsetX, offsetY };
    renderRecaman(ctx, cam, arcs, steps, s.colorMode, s.alternate, canvas.width, canvas.height);
  };

  const regenerate = () => {
    const s = store.get();
    const arcs = generateRecaman(s.terms);
    store.set({ arcs, frame: Math.min(s.frame, s.terms) });
  };

  mountPanel(panelEl, store, regenerate);

  const animator = createAnimator({
    isPlaying: () => store.get().playing,
    onTick: (dt) => {
      const s = store.get();
      const total = s.arcs.starts.length;
      if (total <= 0) return;
      if (s.frame >= total) {
        store.set({ playing: false }); // reached the end → button shows "Replay"
        return;
      }
      const next = s.frame + s.speed * Math.min(dt, 0.1);
      store.set({ frame: Math.min(next, total) });
    },
    render,
  });
  animator.start();
}

const root = document.getElementById("app");
if (root) mount(root);
