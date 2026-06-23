import type { Store } from "../../shared/store";
import { buildUlamData } from "./compute";
import type { UlamState } from "./state";
import type { UlamData } from "./types";

type DoneMessage = {
  type: "done";
  token: number;
  xs: Int32Array;
  ys: Int32Array;
  idx: Int32Array;
  colorIndex: Uint8Array;
  count: number;
};
type ProgressMessage = { type: "progress"; token: number; done: number; total: number };
type WorkerMessage = DoneMessage | ProgressMessage;

const RECOMPUTE_DEBOUNCE_MS = 140;
// Below this the sieve + flag build is sub-frame; compute inline (no worker hop,
// no overlay). Larger N goes to the worker so the UI never freezes.
const SYNC_THRESHOLD = 250_000;

/**
 * Owns the sieve/highlight compute and writes results back into the store.
 * `recompute()` is debounced and tokenised so rapid N / a,b,c drags never pile
 * up — only the latest request's result is applied. Falls back to synchronous
 * compute if Workers are unavailable.
 */
export function createEngine(store: Store<UlamState>): {
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
        applyData(store, {
          xs: msg.xs,
          ys: msg.ys,
          idx: msg.idx,
          colorIndex: msg.colorIndex,
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
    const { n, mode, quad } = store.get();
    store.set({ loading: true, progress: 0 });
    if (worker && n > SYNC_THRESHOLD) {
      worker.postMessage({ n, mode, quad, token: myToken });
    } else {
      const data = buildUlamData(n, mode, quad);
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

function applyData(store: Store<UlamState>, data: UlamData): void {
  store.set({
    data,
    loading: false,
    progress: 1,
    frame: Math.min(store.get().frame, store.get().n),
  });
}
