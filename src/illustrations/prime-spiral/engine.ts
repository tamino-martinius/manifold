import type { Store } from "../../shared/store";
import { buildSpiralData } from "./compute";
import type { PrimeSpiralState } from "./state";
import type { PrimeSpiralData } from "./types";

type DoneMessage = {
  type: "done";
  token: number;
  xs: Float64Array;
  ys: Float64Array;
  isPrime: Uint8Array;
  n: number;
};
type ProgressMessage = { type: "progress"; token: number; done: number; total: number };
type WorkerMessage = DoneMessage | ProgressMessage;

const RECOMPUTE_DEBOUNCE_MS = 140;

/**
 * Owns the sieve/coords worker and writes results into the store. `recompute()`
 * is debounced and tokenised so rapid N edits never pile up — only the latest
 * request's result is applied. Falls back to synchronous compute if Workers are
 * unavailable.
 */
export function createEngine(store: Store<PrimeSpiralState>): {
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
        applyData(store, { xs: msg.xs, ys: msg.ys, isPrime: msg.isPrime, n: msg.n });
      }
    };
  } catch {
    worker = null; // synchronous fallback below
  }

  const run = (): void => {
    token++;
    const myToken = token;
    const { n } = store.get();
    store.set({ loading: true, progress: 0 });
    if (worker) {
      worker.postMessage({ n, token: myToken });
    } else {
      const data = buildSpiralData(n);
      if (myToken === token) applyData(store, data);
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

function applyData(store: Store<PrimeSpiralState>, data: PrimeSpiralData): void {
  store.set({
    data,
    loading: false,
    progress: 1,
    frame: Math.min(store.get().frame, data.n),
  });
}
