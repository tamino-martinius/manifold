// Half-extent (max |x|, max |y|) of the CCW square spiral's first `count` cells,
// computed by an O(1)-memory walk that mirrors chessboard/spiral.ts. The studio
// camera fits to this as the reveal grows — tracked incrementally so a 1e6 reveal
// never builds a coordinate array on the main thread.

export type Extent = { halfX: number; halfY: number };
export type ExtentTracker = {
  /** Advance to `count` revealed cells and return the current half-extent. */
  to(count: number): Extent;
  reset(): void;
};

// E, N, W, S — the same direction order and CCW winding as spiral.ts.
const DIRS: ReadonlyArray<readonly [number, number]> = [
  [1, 0],
  [0, 1],
  [-1, 0],
  [0, -1],
];

export function createExtentTracker(): ExtentTracker {
  let x = 0;
  let y = 0;
  let dir = 0;
  let runLength = 1;
  let stepsLeftInRun = 1;
  let runsAtLength = 0;
  let walked = 1; // cell 1 is the origin
  let halfX = 0;
  let halfY = 0;

  const reset = (): void => {
    x = y = 0;
    dir = 0;
    runLength = 1;
    stepsLeftInRun = 1;
    runsAtLength = 0;
    walked = 1;
    halfX = halfY = 0;
  };

  const to = (count: number): Extent => {
    if (count < walked) reset();
    while (walked < count) {
      if (stepsLeftInRun === 0) {
        dir = (dir + 1) % 4;
        runsAtLength++;
        if (runsAtLength === 2) {
          runsAtLength = 0;
          runLength++;
        }
        stepsLeftInRun = runLength;
      }
      const d = DIRS[dir];
      x += d[0];
      y += d[1];
      stepsLeftInRun--;
      walked++;
      const ax = x < 0 ? -x : x;
      const ay = y < 0 ? -y : y;
      if (ax > halfX) halfX = ax;
      if (ay > halfY) halfY = ay;
    }
    return { halfX, halfY };
  };

  return { to, reset };
}

/** Half-extent of the first `count` spiral cells (1-based; count ≤ 1 ⇒ {0,0}). */
export function spiralExtent(count: number): Extent {
  return createExtentTracker().to(count);
}
