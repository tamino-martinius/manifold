import type { Store } from "../../shared/store";
import { buildGeometry } from "./collatz";
import type { CollatzState } from "./state";

// The deduped build is a few million simple ops — comfortably synchronous even at
// the 50k cap (~10ms), so there's no worker here. `recompute()` is still debounced
// and tokenised exactly like chessboard's engine, so rapid angle/N drags coalesce
// into a single rebuild and stale runs are dropped.
const RECOMPUTE_DEBOUNCE_MS = 140;
const DEG = Math.PI / 180;

export function createEngine(store: Store<CollatzState>): {
  recompute(): void;
  dispose(): void;
} {
  let token = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const run = (): void => {
    const myToken = ++token;
    const s = store.get();
    const geom = buildGeometry({
      n: s.n,
      thetaEvenRad: s.thetaEvenDeg * DEG,
      thetaOddRad: s.thetaOddDeg * DEG,
      segLen: s.segLen,
      lenVar: s.lenVar,
    });
    if (myToken !== token) return; // superseded by a newer run
    // One store write per rebuild: the synchronous build can't yield, so there's
    // no point flipping `loading` on before it (that would just double-notify).
    store.set({
      geom,
      loading: false,
      progress: 1,
      frame: Math.min(s.frame, geom.maxDepth),
    });
  };

  const recompute = (): void => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(run, RECOMPUTE_DEBOUNCE_MS);
  };

  return {
    recompute,
    dispose: () => {
      if (timer) clearTimeout(timer);
    },
  };
}
