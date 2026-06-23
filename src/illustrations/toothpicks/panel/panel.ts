import { pickDistinctColor } from "../../../shared/color";
import { clear, el } from "../../../shared/dom";
import { icon } from "../../../shared/icons";
import type { Store } from "../../../shared/store";
import { PALETTE, SHAPE_PRESETS, STRAIGHT, type ShapePreset, presetNameFor } from "../presets";
import type { ToothpickState } from "../state";
import type { Shape, StrategyKind } from "../types";
import { field, mButton, mIconButton, mNumber, mSegmented, mSlider } from "./controls";
import { dockDiagram } from "./dock-diagram";

const MAX_GEN_CAP = 512;

// Adaptive +/- step for the max-generations field: fine when small, coarser high.
function maxGenStep(value: number): number {
  if (value < 32) return 4;
  if (value < 128) return 16;
  return 32;
}

function updateShape(
  store: Store<ToothpickState>,
  id: string,
  patch: Partial<Shape>,
  onChange: () => void,
): void {
  const shapes = store.get().shapes.map((s) => (s.id === id ? { ...s, ...patch } : s));
  store.set({ shapes });
  onChange();
}

function setPlayContent(btn: HTMLButtonElement, playing: boolean, atEnd: boolean): void {
  const name = playing ? "pause" : atEnd ? "reset" : "play";
  const label = playing ? "Pause" : atEnd ? "Replay" : "Play";
  btn.replaceChildren(icon(name, 14), el("span", {}, [label]));
}

function sectionLabel(text: string): HTMLElement {
  return el("div", { className: "tp-section" }, [el("span", { className: "ds-label" }, [text])]);
}

// Dropdown of shape presets, each shown with a mini dock diagram. Picking one
// replaces the shape's name + docks + visual (color/weight/id are preserved).
function presetPicker(shape: Shape, onPick: (preset: ShapePreset) => void): HTMLElement {
  const menu = el("div", { className: "tp-preset-menu" });
  const trigger = el("button", { type: "button", className: "tp-preset-trigger" }, [
    el("span", {}, [presetNameFor(shape)]),
    icon("chevron-down", 13),
  ]);
  const wrap = el("div", { className: "tp-preset" }, [trigger, menu]);

  const onDocMouseDown = (e: MouseEvent): void => {
    if (!wrap.contains(e.target as Node) && !menu.contains(e.target as Node)) close();
  };
  const onScroll = (e: Event): void => {
    if (!menu.contains(e.target as Node)) close();
  };
  function close(): void {
    wrap.classList.remove("is-open");
    document.removeEventListener("mousedown", onDocMouseDown);
    window.removeEventListener("scroll", onScroll, true);
    window.removeEventListener("resize", close);
  }
  function open(): void {
    const rect = trigger.getBoundingClientRect();
    const margin = 8;
    const spaceBelow = window.innerHeight - rect.bottom - margin;
    const spaceAbove = rect.top - margin;
    menu.style.right = `${Math.round(window.innerWidth - rect.right)}px`;
    if (spaceBelow >= 240 || spaceBelow >= spaceAbove) {
      menu.style.top = `${Math.round(rect.bottom + 4)}px`;
      menu.style.bottom = "auto";
      menu.style.maxHeight = `${Math.max(140, Math.floor(spaceBelow))}px`;
    } else {
      menu.style.bottom = `${Math.round(window.innerHeight - rect.top + 4)}px`;
      menu.style.top = "auto";
      menu.style.maxHeight = `${Math.max(140, Math.floor(spaceAbove))}px`;
    }
    wrap.classList.add("is-open");
    document.addEventListener("mousedown", onDocMouseDown);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", close);
  }

  for (const preset of SHAPE_PRESETS) {
    const item = el("button", { type: "button", className: "tp-preset-item" }, [
      dockDiagram(preset.outDocks, preset.visual, "var(--text)", 34),
      el("span", { className: "tp-preset-name" }, [preset.name]),
    ]);
    item.addEventListener("click", () => {
      close();
      onPick(preset);
    });
    menu.append(item);
  }
  trigger.addEventListener("click", () => (wrap.classList.contains("is-open") ? close() : open()));
  return wrap;
}

export function mountPanel(
  host: HTMLElement,
  store: Store<ToothpickState>,
  onChange: () => void,
): void {
  let scrubEl: HTMLInputElement | null = null;
  let playBtn: HTMLButtonElement | null = null;
  let lastStructKey = "";

  const structKey = (s: ToothpickState): string =>
    JSON.stringify({ shapes: s.shapes, strategy: s.strategy, maxGen: s.maxGen });

  const syncLive = (s: ToothpickState): void => {
    if (scrubEl && document.activeElement !== scrubEl) {
      scrubEl.max = String(s.placed.count);
      scrubEl.value = String(Math.round(s.frame));
    }
    if (playBtn) {
      const atEnd = s.placed.count > 0 && s.frame >= s.placed.count;
      setPlayContent(playBtn, s.playing, atEnd);
    }
  };

  function shapeCard(shape: Shape, index: number, strategyKind: StrategyKind): HTMLElement {
    const swatch = el("input", {
      type: "color",
      className: "tp-swatch",
      value: shape.color,
      onChange: (e: Event) =>
        updateShape(store, shape.id, { color: (e.target as HTMLInputElement).value }, onChange),
    });
    const head = el("div", { className: "tp-piece-head" }, [
      swatch,
      el("span", { className: "ds-label tp-piece-id" }, [`#${index + 1}`]),
    ]);

    const picker = presetPicker(shape, (p) =>
      updateShape(
        store,
        shape.id,
        { name: p.name, outDocks: p.outDocks, visual: p.visual },
        onChange,
      ),
    );
    const block = el("div", { className: "tp-field" }, [
      el("div", { className: "tp-field-head" }, [
        el("span", { className: "tp-field-label ds-label" }, ["Shape"]),
        picker,
      ]),
      dockDiagram(shape.outDocks, shape.visual, shape.color, 132),
    ]);

    const card = el("div", { className: "tp-piece" }, [head, block]);
    if (strategyKind === "weighted") {
      card.append(
        field(
          "Weight",
          mNumber({
            value: shape.weight,
            min: 0,
            onChange: (v) => updateShape(store, shape.id, { weight: v }, onChange),
          }),
        ),
      );
    }
    return card;
  }

  const renderAll = (): void => {
    const s = store.get();
    clear(host);

    playBtn = mButton("Play", {
      icon: "play",
      variant: "primary",
      onClick: () => {
        const st = store.get();
        const atEnd = st.placed.count > 0 && st.frame >= st.placed.count;
        if (atEnd && !st.playing) store.set({ frame: 0, playing: true });
        else store.set({ playing: !st.playing });
      },
    });
    const stepBtn = mButton("Step", {
      icon: "skip-forward",
      onClick: () => {
        const st = store.get();
        const cur = Math.floor(st.frame);
        let target = st.placed.count;
        for (const e of st.placed.genEnds) {
          if (e > cur) {
            target = e;
            break;
          }
        }
        store.set({ playing: false, frame: target });
      },
    });

    scrubEl = mSlider({
      min: 0,
      max: s.placed.count,
      value: Math.round(s.frame),
      onInput: (v) => store.set({ playing: false, frame: v }),
    });
    const speed = mSlider({
      min: 2,
      max: 120,
      value: s.speed,
      onInput: (v) => store.set({ speed: v }),
    });
    const maxGen = mNumber({
      value: s.maxGen,
      min: 1,
      max: MAX_GEN_CAP,
      step: maxGenStep,
      onChange: (v) => {
        store.set({ maxGen: v });
        onChange();
      },
    });
    const order = mSegmented<StrategyKind>(
      [
        { value: "round-robin", label: "Round-robin" },
        { value: "weighted", label: "Weighted" },
      ],
      s.strategy,
      (v) => {
        store.set({ strategy: v });
        onChange();
      },
    );

    const addShape = (): void => {
      const color = pickDistinctColor(
        store.get().shapes.map((sh) => sh.color),
        PALETTE,
      );
      const id = `s${store.get().shapes.length + 1}-${Math.round(performance.now())}`;
      store.set({
        shapes: [
          ...store.get().shapes,
          {
            id,
            name: STRAIGHT.name,
            color,
            weight: 1,
            outDocks: STRAIGHT.outDocks,
            visual: STRAIGHT.visual,
          },
        ],
      });
      onChange();
    };
    const removeShape = (): void => {
      const shapes = store.get().shapes;
      if (shapes.length <= 1) return;
      store.set({ shapes: shapes.slice(0, -1) });
      onChange();
    };

    const shapesHeader = el("div", { className: "tp-section" }, [
      el("span", { className: "ds-label" }, ["Shapes"]),
      el("div", { className: "tp-count" }, [
        mIconButton("minus", { title: "Remove shape", onClick: removeShape }),
        el("span", { className: "tp-count-value" }, [String(s.shapes.length)]),
        mIconButton("plus", { title: "Add shape", onClick: addShape }),
      ]),
    ]);

    const shapesGrid = el("div", { className: "tp-pieces-grid" });
    s.shapes.forEach((shape, i) => shapesGrid.append(shapeCard(shape, i, s.strategy)));

    host.append(
      sectionLabel("Parameters"),
      el("div", { className: "tp-playback" }, [playBtn, stepBtn]),
      field("Zoom", scrubEl),
      field("Speed", speed),
      field("Max generations", maxGen),
      field("Order", order),
      shapesHeader,
      shapesGrid,
    );

    lastStructKey = structKey(s);
    syncLive(s);
  };

  store.subscribe((s) => {
    if (structKey(s) !== lastStructKey) renderAll();
    else syncLive(s);
  });
  renderAll();
}
