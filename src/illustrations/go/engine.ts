import type { Store } from "../../shared/store";
import { computeGoMoves } from "./compute";
import type { GoState } from "./state";
import type { GoData } from "./types";

type DoneMessage = { type: "done"; token: number; data: GoData };
type ProgressMessage = { type: "progress"; token: number; done: number; total: number };
type WorkerMessage = DoneMessage | ProgressMessage;

const RECOMPUTE_DEBOUNCE_MS = 140;

/**
 * Owns the Go compute worker and writes results into the store. `recompute()` is
 * debounced + tokenised so rapid config edits never pile up — only the latest
 * request's result is applied. Falls back to synchronous compute without Workers.
 */
export function createEngine(store: Store<GoState>): {
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
      if (msg.token !== token) return; // stale
      if (msg.type === "progress") {
        store.set({ progress: msg.total > 0 ? msg.done / msg.total : 1 });
      } else {
        applyData(store, msg.data);
      }
    };
  } catch {
    worker = null;
  }

  const run = (): void => {
    token++;
    const myToken = token;
    const { pattern, maxMoves } = store.get();
    store.set({ loading: true, progress: 0 });
    if (worker) {
      worker.postMessage({ pattern, maxMoves, token: myToken });
    } else {
      const data = computeGoMoves(pattern, maxMoves);
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

function applyData(store: Store<GoState>, data: GoData): void {
  store.set({
    data,
    loading: false,
    progress: 1,
    frame: Math.min(store.get().frame, data.count),
  });
}
