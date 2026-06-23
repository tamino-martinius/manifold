import type { Store } from "../../shared/store";
import { computePlacements, packPlacements } from "./placement";
import type { ChessboardState } from "./state";
import type { PlacedData } from "./types";

type DoneMessage = {
  type: "done";
  token: number;
  xs: Int32Array;
  ys: Int32Array;
  colorIndex: Uint8Array;
  colors: string[];
  count: number;
};
type ProgressMessage = { type: "progress"; token: number; done: number; total: number };
type WorkerMessage = DoneMessage | ProgressMessage;

const RECOMPUTE_DEBOUNCE_MS = 140;

/**
 * Owns the placement compute worker and writes results back into the store.
 * `recompute()` is debounced and tokenised so rapid config changes never pile
 * up — only the latest request's result is applied. Falls back to synchronous
 * compute if Workers are unavailable.
 */
export function createEngine(store: Store<ChessboardState>): {
  recompute(): void;
  dispose(): void;
} {
  let token = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;

  let worker: Worker | null = null;
  try {
    worker = new Worker(new URL("./worker.ts", import.meta.url), { type: "module" });
    worker.onmessage = (event: MessageEvent<WorkerMessage>) => {
      const msg = event.data;
      if (msg.token !== token) return; // stale request — ignore
      if (msg.type === "progress") {
        store.set({ progress: msg.total > 0 ? msg.done / msg.total : 1 });
      } else {
        applyPlaced(store, {
          xs: msg.xs,
          ys: msg.ys,
          colorIndex: msg.colorIndex,
          colors: msg.colors,
          count: msg.count,
        });
      }
    };
  } catch {
    worker = null; // synchronous fallback below
  }

  const run = (): void => {
    token++;
    const myToken = token;
    const { pieces, strategy, maxPieces } = store.get();
    store.set({ loading: true, progress: 0 });
    if (worker) {
      worker.postMessage({ pieces, strategy, maxPieces, token: myToken });
    } else {
      const placed = packPlacements(computePlacements(pieces, strategy, maxPieces));
      if (myToken === token) applyPlaced(store, placed);
    }
  };

  const recompute = (): void => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(run, RECOMPUTE_DEBOUNCE_MS);
  };

  return {
    recompute,
    dispose: () => {
      if (timer) clearTimeout(timer);
      worker?.terminate();
    },
  };
}

function applyPlaced(store: Store<ChessboardState>, placed: PlacedData): void {
  store.set({
    placed,
    loading: false,
    progress: 1,
    frame: Math.min(store.get().frame, placed.count),
  });
}
