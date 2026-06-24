import "../../styles/manifold/styles.css";
// Reuse the chessboard studio chrome (.cb-* toolbar / body / panel / controls).
import "../chessboard/chessboard.css";
import "./langtons-ant.css";
import { el } from "../../shared/dom";
import { icon } from "../../shared/icons";
import { initTheme } from "../../shared/theme";
import { themeToggle } from "../../shared/theme-toggle";
import { createAnimator } from "../chessboard/animation";
import { type AntSim, createSim, parseRule, step, stepN } from "./ant";
import { type Camera, easeScale, fitBounds, followAnt } from "./camera";
import { LANGTON_LINKS, type ResourceLink } from "./links";
import { mountPanel } from "./panel";
import { renderAnt } from "./renderer";
import { type LangtonState, createLangtonStore, stepsPerFrame } from "./state";

const ZOOM_RATE = 7; // per-second exponential zoom-easing rate
const FIT_PADDING = 6; // cells of margin around the painted region in "Fit region"

// ---- Toolbar link dropdowns (copied verbatim from chessboard/main.ts) ----
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
  const videos = LANGTON_LINKS.filter((l) => l.kind === "video");
  const refs = LANGTON_LINKS.filter((l) => l.kind === "oeis");
  if (videos.length > 0) right.append(linkDropdown("Videos", videos));
  if (refs.length > 0) right.append(linkDropdown("OEIS", refs));
  right.append(themeToggle("cb-icon-btn cb-icon-btn--secondary"));

  return el("header", { className: "cb-toolbar" }, [
    el("div", { className: "cb-toolbar-left" }, [
      brand,
      el("span", { className: "cb-crumb ds-label" }, ["/ langtons-ant"]),
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
  const store = createLangtonStore();

  const resize = () => {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(wrap.clientWidth * dpr);
    canvas.height = Math.floor(wrap.clientHeight * dpr);
  };
  resize();
  window.addEventListener("resize", resize);

  // The simulation is owned here (not in the store); the store mirrors the live
  // readouts the panel needs. `builtRule` is the rule string the current sim was
  // created from, so we only rebuild when the rule actually changes to a new one.
  let sim: AntSim = createSim(parseRule(store.get().rule));
  let builtRule = store.get().rule;
  let displayScale = 0; // 0 = snap sentinel (camera jumps to fit on first frame / reset)
  let lastT = 0;

  const applyTrail = (s: LangtonState): void => {
    sim.trackTrail = s.trail === "comet";
  };

  const syncReadouts = (playing: boolean): void =>
    store.set({ playing, steps: sim.steps, blackCount: sim.blackCount, highway: sim.highway });

  // Commit a rule string: rebuild the sim on a valid rule (a structural reset),
  // or surface the parse error inline while keeping the current sim. Always
  // called from a user-action handler — never from a store subscriber — so the
  // store.set here is not re-entrant.
  const commitRule = (rule: string): void => {
    try {
      const parsed = parseRule(rule);
      sim = createSim(parsed);
      builtRule = rule;
      displayScale = 0; // snap the camera to the fresh (origin) framing
      applyTrail(store.get());
      store.set({ rule, ruleError: null, steps: 0, blackCount: 0, highway: false });
    } catch (e) {
      // Echo the typed text and show the error; the last valid sim keeps running.
      store.set({ rule, ruleError: (e as Error).message });
    }
  };

  mountPanel(panelEl, store, {
    step: () => {
      step(sim);
      syncReadouts(false);
    },
    reset: () => {
      commitRule(builtRule); // rebuild the last valid rule from scratch
      store.set({ playing: false });
    },
    forward: (steps) => {
      // Jump ahead synchronously; keep the current play state so you can skip
      // forward and carry on watching (or stay paused to inspect the landing).
      stepN(sim, steps);
      store.set({ steps: sim.steps, blackCount: sim.blackCount, highway: sim.highway });
    },
    setRule: commitRule,
  });

  // Read-only reaction to store changes (the comet trail flag). Never writes the
  // store, so it cannot re-enter the notify loop. Seed it once so a comet default
  // records from the very first frame.
  applyTrail(store.get());
  store.subscribe(applyTrail);

  // Dirty-flag guard so a paused, settled view stops redrawing.
  let drawSteps = -1;
  let drawScale = -1;
  let drawW = -1;
  let drawH = -1;
  let drawMode = "";
  let drawTrail = "";
  let drawTheme = "";

  const render = (): void => {
    const s = store.get();
    const w = canvas.width;
    const h = canvas.height;
    // Cell + ant colors are theme-driven, so a theme flip must repaint even when
    // paused (the dirty-guard would otherwise hold the old palette on the canvas).
    const theme = document.documentElement.dataset.theme ?? "";

    // Center world point + target scale per camera mode. Offsets are recomputed
    // from the eased scale each frame so the center stays pinned while zooming.
    let cx: number;
    let cy: number;
    let target: Camera;
    if (s.mode === "follow") {
      cx = sim.x;
      cy = sim.y;
      target = followAnt(sim.x, sim.y, s.followCells, w, h);
    } else {
      cx = (sim.minX + sim.maxX) / 2;
      cy = (sim.minY + sim.maxY) / 2;
      target = fitBounds(sim.minX, sim.maxX, sim.minY, sim.maxY, w, h, FIT_PADDING);
    }

    const now = performance.now();
    const dt = lastT === 0 ? 0 : (now - lastT) / 1000;
    lastT = now;
    displayScale = easeScale(displayScale, target.scale, dt, ZOOM_RATE);

    const dirty =
      sim.steps !== drawSteps ||
      Math.abs(displayScale - drawScale) > 1e-3 ||
      w !== drawW ||
      h !== drawH ||
      s.mode !== drawMode ||
      s.trail !== drawTrail ||
      theme !== drawTheme;
    if (!dirty) return;
    drawSteps = sim.steps;
    drawScale = displayScale;
    drawW = w;
    drawH = h;
    drawMode = s.mode;
    drawTrail = s.trail;
    drawTheme = theme;

    const cam: Camera = {
      scale: displayScale,
      offsetX: w / 2 - cx * displayScale,
      offsetY: h / 2 + cy * displayScale,
    };
    renderAnt(ctx, cam, sim, w, h, s.trail === "comet");
  };

  const animator = createAnimator({
    isPlaying: () => store.get().playing,
    onTick: () => {
      stepN(sim, stepsPerFrame(store.get().speed));
      store.set({ steps: sim.steps, blackCount: sim.blackCount, highway: sim.highway });
    },
    render,
  });
  animator.start();
}

const root = document.getElementById("app");
if (root) mount(root);
