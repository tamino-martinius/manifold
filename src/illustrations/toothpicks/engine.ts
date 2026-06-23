import type { Store } from "../../shared/store";
import { computeToothpicks, packToothpicks } from "./growth";
import type { ToothpickState } from "./state";
import type { PlacedData } from "./types";

type DoneMessage = {
  type: "done";
  token: number;
  x1: Float32Array;
  y1: Float32Array;
  x2: Float32Array;
  y2: Float32Array;
  colorIndex: Uint8Array;
  instanceIndex: Uint32Array;
  colors: string[];
  count: number;
  segCount: number;
  genEnds: number[];
  genSegEnds: number[];
};
type ProgressMessage = { type: "progress"; token: number; done: number; total: number };
type WorkerMessage = DoneMessage | ProgressMessage;

const RECOMPUTE_DEBOUNCE_MS = 140;

/**
 * Owns the growth compute worker and writes results back into the store.
 * `recompute()` is debounced and tokenised so rapid config changes never pile
 * up — only the latest request's result is applied. Falls back to synchronous
 * compute if Workers are unavailable.
 */
export function createToothpickEngine(store: Store<ToothpickState>): {
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
          x1: msg.x1,
          y1: msg.y1,
          x2: msg.x2,
          y2: msg.y2,
          colorIndex: msg.colorIndex,
          instanceIndex: msg.instanceIndex,
          colors: msg.colors,
          count: msg.count,
          segCount: msg.segCount,
          genEnds: msg.genEnds,
          genSegEnds: msg.genSegEnds,
        });
      }
    };
  } catch {
    worker = null; // synchronous fallback below
  }

  const run = (): void => {
    token++;
    const myToken = token;
    const { shapes, strategy, maxGen } = store.get();
    store.set({ loading: true, progress: 0 });
    if (worker) {
      worker.postMessage({ shapes, strategy, maxGen, token: myToken });
    } else {
      const placed = packToothpicks(computeToothpicks(shapes, strategy, maxGen));
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

function applyPlaced(store: Store<ToothpickState>, placed: PlacedData): void {
  store.set({
    placed,
    loading: false,
    progress: 1,
    // `frame` is a generation count, so clamp it to the generation count — not the
    // (much larger) instance count — or a recompute that shrinks the structure
    // would leave `frame` out of [0, G] in the store.
    frame: Math.min(store.get().frame, placed.genSegEnds.length),
  });
}
