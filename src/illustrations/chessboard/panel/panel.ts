import { clear, el } from "../../../shared/dom";
import type { Store } from "../../../shared/store";
import { icon } from "../../../shared/icons";
import { clampOffsets } from "../pieces";
import type { ChessboardState } from "../state";
import type { GridSize, Piece, StrategyKind } from "../types";
import { field, mButton, mIconButton, mNumber, mSegmented, mSlider } from "./controls";
import { movementGrid, toggleOffset } from "./movement-grid";

const PALETTE = ["#3ddc84", "#ff5b47", "#22d3ee", "#ffb000", "#9d8cff", "#ff2e97"];
const GRID_SIZES: GridSize[] = [3, 5, 7, 9];

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

function setPlayContent(btn: HTMLButtonElement, playing: boolean): void {
  btn.replaceChildren(
    icon(playing ? "pause" : "play", 14),
    el("span", {}, [playing ? "Pause" : "Play"]),
  );
}

function sectionLabel(text: string, trailing?: string): HTMLElement {
  return el("div", { className: "cb-section" }, [
    el("span", { className: "ds-label" }, [text]),
    ...(trailing ? [el("span", { className: "ds-label cb-section-meta" }, [trailing])] : []),
  ]);
}

export function mountPanel(
  host: HTMLElement,
  store: Store<ChessboardState>,
  onChange: () => void,
): void {
  let scrubEl: HTMLInputElement | null = null;
  let playBtn: HTMLButtonElement | null = null;
  let lastStructKey = "";

  const structKey = (s: ChessboardState): string =>
    JSON.stringify({ pieces: s.pieces, strategy: s.strategy, maxPieces: s.maxPieces });

  const syncLive = (s: ChessboardState): void => {
    if (scrubEl && document.activeElement !== scrubEl) {
      scrubEl.max = String(s.placements.length);
      scrubEl.value = String(Math.round(s.frame));
    }
    if (playBtn) setPlayContent(playBtn, s.playing);
  };

  function pieceCard(piece: Piece, index: number, strategyKind: StrategyKind): HTMLElement {
    const swatch = el("input", {
      type: "color",
      className: "cb-swatch",
      value: piece.color,
      onChange: (e: Event) =>
        updatePiece(store, piece.id, { color: (e.target as HTMLInputElement).value }, onChange),
    });

    const remove = mIconButton("x", {
      title: "Remove piece",
      variant: "danger",
      onClick: () => {
        if (store.get().pieces.length <= 1) return;
        store.set({ pieces: store.get().pieces.filter((p) => p.id !== piece.id) });
        onChange();
      },
    });

    const head = el("div", { className: "cb-piece-head" }, [
      el("div", { className: "cb-piece-id" }, [
        swatch,
        el("span", { className: "ds-label" }, [`piece ${index + 1}`]),
      ]),
      remove,
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

    const card = el("div", { className: "cb-piece" }, [
      head,
      field("Grid", sizes),
      field("Moves", grid),
    ]);

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
      onClick: () => store.set({ playing: !store.get().playing }),
    });
    const stepBtn = mButton("Step", {
      icon: "skip-forward",
      onClick: () => {
        const st = store.get();
        store.set({
          playing: false,
          frame: Math.min(Math.floor(st.frame) + 1, st.placements.length),
        });
      },
    });

    scrubEl = mSlider({
      min: 0,
      max: s.placements.length,
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
      max: 100000,
      step: 500,
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

    host.append(
      sectionLabel("Parameters"),
      el("div", { className: "cb-playback" }, [playBtn, stepBtn]),
      field("Zoom", scrubEl),
      field("Speed", speed),
      field("Max pieces", maxPieces),
      field("Order", order),
      sectionLabel("Pieces", `${s.pieces.length}`),
    );

    s.pieces.forEach((piece, i) => host.append(pieceCard(piece, i, s.strategy)));

    host.append(
      mButton("Add piece", {
        icon: "plus",
        variant: "ghost",
        onClick: () => {
          const used = new Set(store.get().pieces.map((p) => p.color));
          const color = PALETTE.find((c) => !used.has(c)) ?? "#888888";
          const id = `p${store.get().pieces.length + 1}-${Math.round(performance.now())}`;
          store.set({
            pieces: [...store.get().pieces, { id, color, gridSize: 5, offsets: [], weight: 1 }],
          });
          onChange();
        },
      }),
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
