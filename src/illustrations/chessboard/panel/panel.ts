import { clear, el } from "../../../shared/dom";
import type { Store } from "../../../shared/store";
import { clampOffsets } from "../pieces";
import type { ChessboardState } from "../state";
import type { GridSize, Piece, StrategyKind } from "../types";
import { movementGrid, toggleOffset } from "./movement-grid";

const PALETTE = ["#000000", "#e10600", "#1f6feb", "#2da44e", "#a371f7", "#fb8500"];

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
    if (playBtn) playBtn.textContent = s.playing ? "⏸ Pause" : "▶ Play";
  };

  function pieceCard(piece: Piece, strategyKind: StrategyKind): HTMLElement {
    const card = el("div", { className: "cb-piece" });

    const colorInput = el("input", {
      type: "color",
      value: piece.color,
      onChange: (e: Event) =>
        updatePiece(store, piece.id, { color: (e.target as HTMLInputElement).value }, onChange),
    });

    const sizeSelect = el(
      "select",
      {
        onChange: (e: Event) => {
          const gridSize = Number((e.target as HTMLSelectElement).value) as GridSize;
          updatePiece(
            store,
            piece.id,
            { gridSize, offsets: clampOffsets(piece.offsets, gridSize) },
            onChange,
          );
        },
      },
      ([3, 5, 7, 9] as GridSize[]).map((n) => el("option", { value: String(n) }, [`${n}×${n}`])),
    ) as HTMLSelectElement;
    sizeSelect.value = String(piece.gridSize);

    const removeBtn = el(
      "button",
      {
        className: "cb-btn",
        onClick: () => {
          if (store.get().pieces.length <= 1) return;
          store.set({ pieces: store.get().pieces.filter((p) => p.id !== piece.id) });
          onChange();
        },
      },
      ["✕"],
    );

    card.append(el("div", { className: "cb-piece-head" }, [colorInput, sizeSelect, removeBtn]));
    card.append(
      movementGrid(piece.gridSize, piece.offsets, (dx, dy) =>
        updatePiece(store, piece.id, { offsets: toggleOffset(piece.offsets, dx, dy) }, onChange),
      ),
    );

    if (strategyKind === "weighted") {
      card.append(
        el("div", { className: "cb-row" }, [
          el("label", {}, ["Weight"]),
          el("input", {
            type: "number",
            min: "0",
            value: String(piece.weight),
            onChange: (e: Event) =>
              updatePiece(
                store,
                piece.id,
                { weight: Math.max(0, Number((e.target as HTMLInputElement).value)) },
                onChange,
              ),
          }),
        ]),
      );
    }
    return card;
  }

  const renderAll = (): void => {
    const s = store.get();
    clear(host);
    host.append(el("h1", {}, ["Chessboard Patterns"]));

    const controls = el("div", { className: "cb-controls" });

    playBtn = el(
      "button",
      { className: "cb-btn", onClick: () => store.set({ playing: !store.get().playing }) },
      [s.playing ? "⏸ Pause" : "▶ Play"],
    ) as HTMLButtonElement;

    const stepBtn = el(
      "button",
      {
        className: "cb-btn",
        onClick: () => {
          const st = store.get();
          store.set({
            playing: false,
            frame: Math.min(Math.floor(st.frame) + 1, st.placements.length),
          });
        },
      },
      ["Step ›"],
    );
    controls.append(el("div", { className: "cb-row" }, [playBtn, stepBtn]));

    scrubEl = el("input", {
      type: "range",
      className: "cb-slider",
      min: "0",
      max: String(s.placements.length),
      value: String(Math.round(s.frame)),
      onInput: (e: Event) =>
        store.set({ playing: false, frame: Number((e.target as HTMLInputElement).value) }),
    }) as HTMLInputElement;
    controls.append(el("div", { className: "cb-row" }, [el("label", {}, ["Zoom"]), scrubEl]));

    controls.append(
      el("div", { className: "cb-row" }, [
        el("label", {}, ["Speed"]),
        el("input", {
          type: "range",
          className: "cb-slider",
          min: "2",
          max: "120",
          value: String(s.speed),
          onInput: (e: Event) => store.set({ speed: Number((e.target as HTMLInputElement).value) }),
        }),
      ]),
    );

    controls.append(
      el("div", { className: "cb-row" }, [
        el("label", {}, ["Max pieces"]),
        el("input", {
          type: "number",
          min: "1",
          max: "20000",
          value: String(s.maxPieces),
          onChange: (e: Event) => {
            store.set({ maxPieces: Math.max(1, Number((e.target as HTMLInputElement).value)) });
            onChange();
          },
        }),
      ]),
    );

    const strategy = el(
      "select",
      {
        onChange: (e: Event) => {
          store.set({ strategy: (e.target as HTMLSelectElement).value as StrategyKind });
          onChange();
        },
      },
      [
        el("option", { value: "round-robin" }, ["Round-robin"]),
        el("option", { value: "weighted" }, ["Weighted"]),
      ],
    ) as HTMLSelectElement;
    strategy.value = s.strategy;
    controls.append(el("div", { className: "cb-row" }, [el("label", {}, ["Order"]), strategy]));

    host.append(controls);

    for (const piece of s.pieces) host.append(pieceCard(piece, s.strategy));

    host.append(
      el(
        "button",
        {
          className: "cb-btn",
          onClick: () => {
            const used = new Set(store.get().pieces.map((p) => p.color));
            const color = PALETTE.find((c) => !used.has(c)) ?? "#888888";
            const id = `p${store.get().pieces.length + 1}-${Math.round(performance.now())}`;
            store.set({
              pieces: [...store.get().pieces, { id, color, gridSize: 5, offsets: [], weight: 1 }],
            });
            onChange();
          },
        },
        ["+ Add piece"],
      ),
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
