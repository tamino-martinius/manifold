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
 * debounced so a burst of edits collapses to one run. A worker runs
 * `computeGoMoves` synchronously and can't observe a newer message until it
 * finishes — so a request that supersedes an in-flight one terminates the busy
 * worker (aborting the now-stale computation) and spawns a fresh one, instead of
 * letting queued requests each run to completion and stack up the loading time.
 * The token guards against a straggler `done` from a just-terminated worker.
 * Falls back to synchronous compute when Workers are unavailable.
 */
export function createEngine(store: Store<GoState>): {
  recompute(): void;
  dispose(): void;
} {
  let token = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let worker: Worker | null = null;
  let busy = false; // a request is in flight in the worker
  let workersOk = true; // false once Worker construction has failed

  const spawn = (): Worker | null => {
    if (!workersOk) return null;
    try {
      const w = new Worker(new URL("./worker.ts", import.meta.url), { type: "module" });
      w.onmessage = (event: MessageEvent<WorkerMessage>) => {
        const msg = event.data;
        if (msg.token !== token) return; // stale (e.g. straggler from a terminated worker)
        if (msg.type === "progress") {
          store.set({ progress: msg.total > 0 ? msg.done / msg.total : 1 });
        } else {
          busy = false;
          applyData(store, msg.data);
        }
      };
      return w;
    } catch {
      workersOk = false;
      return null;
    }
  };

  const run = (): void => {
    token++;
    const myToken = token;
    const { pattern, maxMoves } = store.get();
    store.set({ loading: true, progress: 0 });

    // Abort a superseded in-flight computation so only the latest request runs.
    if (busy && worker) {
      worker.terminate();
      worker = null;
      busy = false;
    }
    if (workersOk && !worker) worker = spawn();

    if (worker) {
      busy = true;
      worker.postMessage({ pattern, maxMoves, token: myToken });
    } else {
      const data = computeGoMoves(pattern, maxMoves);
      if (myToken === token) applyData(store, data);
    }
  };

  worker = spawn(); // warm up front so the first compute pays no spawn latency

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
