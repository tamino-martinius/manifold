import { pickDistinctColor } from "../../../shared/color";
import { clear, el } from "../../../shared/dom";
import { icon } from "../../../shared/icons";
import type { Store } from "../../../shared/store";
import type { ResourceLink } from "../links";
import { clampOffsets, knightOffsets } from "../pieces";
import { MOVEMENT_PRESETS, type MovementPreset, presetNameFor } from "../presets";
import type { ChessboardState } from "../state";
import type { GridSize, Piece, StrategyKind } from "../types";
import { field, mButton, mIconButton, mNumber, mSegmented, mSlider } from "./controls";
import { miniGrid, movementGrid, toggleOffset } from "./movement-grid";

// Distinct hues (the default pieces already cover black + red), kept darker and
// muted so they hold contrast against the light-grey board; picked by maximum
// distance from existing pieces so new pieces never echo a hue.
const PALETTE = ["#1f7a4d", "#0e7490", "#b45309", "#6d28d9", "#be185d", "#1d4ed8"];
const GRID_SIZES: GridSize[] = [3, 5, 7, 9];
const MAX_PIECES_CAP = 1_000_000;

// Adaptive +/- step for the max-pieces field: small near the bottom, coarser
// as the count grows (500 → 1k → 2k → 5k → 10k).
function maxPiecesStep(value: number): number {
  if (value < 2000) return 500;
  if (value < 5000) return 1000;
  if (value < 20000) return 2000;
  if (value < 50000) return 5000;
  return 10000;
}

function updatePiece(
  store: Store<ChessboardState>,
  id: string,
  patch: Partial<Piece>,
  onChange: () => void,
): void {
  const pieces = store.get().pieces.map((p) => (p.id === id ? { ...p, ...patch } : p));
  store.set({ pieces });
  onChange();
}

function setPlayContent(btn: HTMLButtonElement, playing: boolean, atEnd: boolean): void {
  const name = playing ? "pause" : atEnd ? "reset" : "play";
  const label = playing ? "Pause" : atEnd ? "Replay" : "Play";
  btn.replaceChildren(icon(name, 14), el("span", {}, [label]));
}

function sectionLabel(text: string, trailing?: string): HTMLElement {
  return el("div", { className: "cb-section" }, [
    el("span", { className: "ds-label" }, [text]),
    ...(trailing ? [el("span", { className: "ds-label cb-section-meta" }, [trailing])] : []),
  ]);
}

// A dropdown of predefined symmetric movement patterns, each shown with a mini
// preview. Picking one replaces the piece's grid size + offsets.
function presetPicker(piece: Piece, onPick: (preset: MovementPreset) => void): HTMLElement {
  const menu = el("div", { className: "cb-preset-menu" });
  const trigger = el("button", { type: "button", className: "cb-preset-trigger" }, [
    el("span", {}, [presetNameFor(piece.gridSize, piece.offsets)]),
    icon("chevron-down", 13),
  ]);
  const wrap = el("div", { className: "cb-preset" }, [trigger, menu]);

  const onDocMouseDown = (e: MouseEvent): void => {
    if (!wrap.contains(e.target as Node) && !menu.contains(e.target as Node)) close();
  };
  // Close when the page/panel scrolls, but NOT when scrolling inside the menu.
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
    // Fixed positioning so the menu escapes the panel's scroll/overflow clip.
    // Flip above the trigger when there isn't room below, and cap the height to
    // the available space so the last items always stay on screen.
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

  for (const preset of MOVEMENT_PRESETS) {
    const item = el("button", { type: "button", className: "cb-preset-item" }, [
      miniGrid(preset.gridSize, preset.offsets),
      el("span", { className: "cb-preset-name" }, [preset.name]),
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

function linksSection(links: ResourceLink[]): HTMLElement {
  const list = el("div", { className: "cb-links" });
  for (const v of links) {
    list.append(
      el(
        "a",
        {
          className: `cb-link cb-link--${v.kind}`,
          href: v.url,
          target: "_blank",
          rel: "noopener noreferrer",
          title: v.title,
        },
        [
          icon(v.kind === "video" ? "youtube" : "hash", 16),
          el("span", { className: "cb-link-text" }, [
            el("span", { className: "cb-link-title" }, [v.title]),
            el("span", { className: "ds-label cb-link-label" }, [v.label]),
          ]),
        ],
      ),
    );
  }
  return list;
}

export function mountPanel(
  host: HTMLElement,
  store: Store<ChessboardState>,
  onChange: () => void,
  links: ResourceLink[] = [],
): void {
  let scrubEl: HTMLInputElement | null = null;
  let playBtn: HTMLButtonElement | null = null;
  let lastStructKey = "";

  const structKey = (s: ChessboardState): string =>
    JSON.stringify({ pieces: s.pieces, strategy: s.strategy, maxPieces: s.maxPieces });

  const syncLive = (s: ChessboardState): void => {
    if (scrubEl && document.activeElement !== scrubEl) {
      scrubEl.max = String(s.placed.count);
      scrubEl.value = String(Math.round(s.frame));
    }
    if (playBtn) {
      const atEnd = s.placed.count > 0 && s.frame >= s.placed.count;
      setPlayContent(playBtn, s.playing, atEnd);
    }
  };

  function pieceCard(piece: Piece, index: number, strategyKind: StrategyKind): HTMLElement {
    const swatch = el("input", {
      type: "color",
      className: "cb-swatch",
      value: piece.color,
      onChange: (e: Event) =>
        updatePiece(store, piece.id, { color: (e.target as HTMLInputElement).value }, onChange),
    });

    const head = el("div", { className: "cb-piece-head" }, [
      swatch,
      el("span", { className: "ds-label cb-piece-id" }, [`#${index + 1}`]),
    ]);

    const sizes = mSegmented(
      GRID_SIZES.map((n) => ({ value: String(n), label: String(n) })),
      String(piece.gridSize),
      (v) => {
        const gridSize = Number(v) as GridSize;
        updatePiece(
          store,
          piece.id,
          { gridSize, offsets: clampOffsets(piece.offsets, gridSize) },
          onChange,
        );
      },
    );

    const grid = movementGrid(piece.gridSize, piece.offsets, (dx, dy) =>
      updatePiece(store, piece.id, { offsets: toggleOffset(piece.offsets, dx, dy) }, onChange),
    );

    const preset = presetPicker(piece, (p) =>
      updatePiece(
        store,
        piece.id,
        { gridSize: p.gridSize, offsets: p.offsets.map(([x, y]) => [x, y] as [number, number]) },
        onChange,
      ),
    );
    const moves = el("div", { className: "cb-field" }, [
      el("div", { className: "cb-field-head" }, [
        el("span", { className: "cb-field-label ds-label" }, ["Moves"]),
        preset,
      ]),
      grid,
    ]);

    const card = el("div", { className: "cb-piece" }, [head, field("Grid", sizes), moves]);

    if (strategyKind === "weighted") {
      card.append(
        field(
          "Weight",
          mNumber({
            value: piece.weight,
            min: 0,
            onChange: (v) => updatePiece(store, piece.id, { weight: v }, onChange),
          }),
        ),
      );
    }
    return card;
  }

  const renderAll = (): void => {
    const s = store.get();
    clear(host);

    // Playback
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
        store.set({
          playing: false,
          frame: Math.min(Math.floor(st.frame) + 1, st.placed.count),
        });
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
    const maxPieces = mNumber({
      value: s.maxPieces,
      min: 1,
      max: MAX_PIECES_CAP,
      step: maxPiecesStep,
      onChange: (v) => {
        store.set({ maxPieces: v });
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

    const addPiece = (): void => {
      const color = pickDistinctColor(
        store.get().pieces.map((p) => p.color),
        PALETTE,
      );
      const id = `p${store.get().pieces.length + 1}-${Math.round(performance.now())}`;
      store.set({
        pieces: [
          ...store.get().pieces,
          { id, color, gridSize: 5, offsets: knightOffsets(), weight: 1 },
        ],
      });
      onChange();
    };
    const removePiece = (): void => {
      const pieces = store.get().pieces;
      if (pieces.length <= 1) return;
      store.set({ pieces: pieces.slice(0, -1) });
      onChange();
    };

    const piecesHeader = el("div", { className: "cb-section" }, [
      el("span", { className: "ds-label" }, ["Pieces"]),
      el("div", { className: "cb-count" }, [
        mIconButton("minus", { title: "Remove piece", onClick: removePiece }),
        el("span", { className: "cb-count-value" }, [String(s.pieces.length)]),
        mIconButton("plus", { title: "Add piece", onClick: addPiece }),
      ]),
    ]);

    const piecesGrid = el("div", { className: "cb-pieces-grid" });
    s.pieces.forEach((piece, i) => piecesGrid.append(pieceCard(piece, i, s.strategy)));

    host.append(
      sectionLabel("Parameters"),
      el("div", { className: "cb-playback" }, [playBtn, stepBtn]),
      field("Zoom", scrubEl),
      field("Speed", speed),
      field("Max pieces", maxPieces),
      field("Order", order),
      piecesHeader,
      piecesGrid,
    );

    if (links.length > 0) host.append(sectionLabel("Links"), linksSection(links));

    lastStructKey = structKey(s);
    syncLive(s);
  };

  store.subscribe((s) => {
    if (structKey(s) !== lastStructKey) renderAll();
    else syncLive(s);
  });
  renderAll();
}
