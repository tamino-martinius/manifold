import type { GoData } from "./types";

/**
 * Per-color live-stone counts sampled at evenly-spaced turns across the whole
 * fill. `counts[i * colorCount + c]` is color `c`'s live count at turn `turns[i]`.
 */
export type Distribution = {
  turns: Uint32Array;
  counts: Uint32Array;
  colorCount: number;
  samples: number;
};

/**
 * Derived from the color streams alone (no board): live[c] rises on a placement of
 * `c` and falls on a capture of `c`. Snapshots the running counts at `samples`
 * evenly-spaced turn boundaries (capped at the move count). O(moves), one pass.
 */
export function colorDistribution(data: GoData, samples: number): Distribution {
  const C = data.colors.length;
  const n = Math.max(1, Math.min(samples, data.count || 1));
  const turns = new Uint32Array(n);
  const counts = new Uint32Array(n * C);
  if (data.count === 0 || C === 0) return { turns, counts, colorCount: C, samples: n };

  const live = new Int32Array(C);
  // Sample i is taken after ceil((i+1)/n * count) moves; the last sample lands
  // exactly at `count`.
  const boundaryFor = (i: number): number => Math.ceil(((i + 1) * data.count) / n);
  let sample = 0;
  let boundary = boundaryFor(0);
  for (let m = 0; m < data.count; m++) {
    live[data.placedColor[m]]++;
    for (let k = data.capOffset[m]; k < data.capOffset[m + 1]; k++) live[data.capColor[k]]--;
    const applied = m + 1;
    while (sample < n && applied >= boundary) {
      turns[sample] = applied;
      counts.set(live, sample * C);
      sample++;
      if (sample < n) boundary = boundaryFor(sample);
    }
  }
  return { turns, counts, colorCount: C, samples: n };
}
