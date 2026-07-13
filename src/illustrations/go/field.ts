// A flat typed-array Go board sized to a fixed radius (the spiral fill for a
// given move budget stays well inside it, with padding, so the border ring is
// always empty and neighbour reads never wrap into a live cell). Direct integer
// indexing replaces the hashed `Map` lookups of a cellKey→color map, and an
// allocation-free flood-fill — a generation-stamped `visited` array plus reused
// stack/stones/captured buffers instead of a fresh Set + arrays per call —
// replaces per-call allocation. Together these make the placement compute
// ~10x faster at 1e6 moves; output is byte-identical (guarded by the
// golden-checksum tests in compute.test.ts).

export type Field = {
  readonly SIDE: number;
  /** Reused output buffer: after a legal `resolveAt`, holds the captured cells'
   *  flat indices in `[0, count)` (see the returned `count`). */
  readonly captured: Int32Array;
  index(x: number, y: number): number;
  xOf(idx: number): number;
  yOf(idx: number): number;
  /** 0 = empty, else colorIdx + 1. */
  colorAt(idx: number): number;
  set(idx: number, colVal: number): void;
  clear(idx: number): void;
  /**
   * Legality + captures for playing `colVal` (= colorIdx + 1) on the empty cell
   * `idx`, WITHOUT mutating the board. Captures are resolved first (standard Go),
   * then suicide. Returns `{ legal, count }`; on a legal move, `captured[0..count)`
   * holds the captured cells (enemy stones still on the board — the caller removes
   * them when committing). Precondition: `idx` is empty.
   */
  resolveAt(idx: number, colVal: number): { legal: boolean; count: number };
};

export function createField(radius: number): Field {
  const SIDE = 2 * radius + 1;
  const N = SIDE * SIDE;
  const HALF = radius;
  const cells = new Int16Array(N); // 0 empty, else colorIdx + 1
  const visited = new Int32Array(N); // generation stamp per cell
  const capMark = new Int32Array(N); // per-move stamp of already-captured cells
  const stack = new Int32Array(N); // reused DFS stack (flat indices)
  const stones = new Int32Array(N); // reused group buffer (flat indices)
  const captured = new Int32Array(N); // reused capture output (flat indices)
  const DIRS = [1, -1, SIDE, -SIDE];
  let gen = 0;
  let capGen = 0;

  // Flood the same-color group at `start`; return its stone count (stones[0..n))
  // or -1 the moment an empty neighbour (a liberty) is seen. Live groups cost
  // only the walk to their nearest empty point.
  function scanGroup(start: number, colVal: number): number {
    gen++;
    let sp = 0;
    let np = 0;
    visited[start] = gen;
    stack[sp++] = start;
    while (sp > 0) {
      const idx = stack[--sp];
      stones[np++] = idx;
      for (let d = 0; d < 4; d++) {
        const nb = idx + DIRS[d];
        const v = cells[nb];
        if (v === 0) return -1;
        if (v === colVal && visited[nb] !== gen) {
          visited[nb] = gen;
          stack[sp++] = nb;
        }
      }
    }
    return np;
  }

  return {
    SIDE,
    captured,
    index: (x, y) => x + HALF + (y + HALF) * SIDE,
    xOf: (idx) => (idx % SIDE) - HALF,
    yOf: (idx) => Math.floor(idx / SIDE) - HALF,
    colorAt: (idx) => cells[idx],
    set: (idx, colVal) => {
      cells[idx] = colVal;
    },
    clear: (idx) => {
      cells[idx] = 0;
    },
    resolveAt(idx, colVal) {
      cells[idx] = colVal; // tentatively place so enemy groups see it
      capGen++;
      let count = 0;
      for (let d = 0; d < 4; d++) {
        const nb = idx + DIRS[d];
        const v = cells[nb];
        if (v !== 0 && v !== colVal && capMark[nb] !== capGen) {
          const n = scanGroup(nb, v);
          if (n >= 0) {
            for (let i = 0; i < n; i++) {
              const s = stones[i];
              if (capMark[s] !== capGen) {
                capMark[s] = capGen;
                captured[count++] = s;
              }
            }
          }
        }
      }
      // No capture: legal iff the placed stone's own group has a liberty.
      const legal = count > 0 ? true : scanGroup(idx, colVal) === -1;
      cells[idx] = 0; // restore — net zero mutation
      return { legal, count };
    },
  };
}
