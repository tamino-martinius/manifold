import type { Store } from "../../shared/store";
import { type GoldbachData, goldbachCounts } from "./goldbach";
import type { GoldbachState } from "./state";

type DoneMessage = { type: "done"; token: number; E: Int32Array; g: Int32Array; maxG: number };
type ProgressMessage = { type: "progress"; token: number; done: number; total: number };
type WorkerMessage = DoneMessage | ProgressMessage;

const RECOMPUTE_DEBOUNCE_MS = 140;
// At/below this N the accumulation is a few ms — compute inline (no overlay).
// Above it, hand off to the worker so the UI never freezes.
const SYNC_THRESHOLD = 50_000;

/**
 * Owns the Goldbach compute worker and writes results back into the store.
 * `recompute()` is debounced and tokenised so rapid `N` drags never pile up —
 * only the latest request's result is applied. Small `N` computes synchronously;
 * large `N` (or any `N` if Workers are unavailable) uses the worker with a
 * progress overlay. Falls back to synchronous if the worker can't be created.
 */
export function createEngine(store: Store<GoldbachState>): {
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
        applyData(store, { E: msg.E, g: msg.g, maxG: msg.maxG });
      }
    };
  } catch {
    worker = null; // synchronous fallback below
  }

  const run = (): void => {
    token++;
    const myToken = token;
    const { N } = store.get();
    if (worker && N > SYNC_THRESHOLD) {
      store.set({ loading: true, progress: 0 });
      worker.postMessage({ n: N, token: myToken });
    } else {
      // Cheap enough to run inline — no loading overlay.
      const data = goldbachCounts(N);
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

function applyData(store: Store<GoldbachState>, data: GoldbachData): void {
  store.set({
    data,
    loading: false,
    progress: 1,
    frame: Math.min(store.get().frame, data.E.length),
  });
}
