import { describe, expect, it } from "vitest";
import { computeGoMoves } from "./compute";
import { colorDistribution } from "./distribution";

const BLACK = "#171717";
const WHITE = "#f4efe4";

// Brute-force live counts per color after the first `n` moves, from the deltas.
function liveAt(data: ReturnType<typeof computeGoMoves>, n: number): number[] {
  const live = new Array(data.colors.length).fill(0);
  for (let m = 0; m < n; m++) {
    live[data.placedColor[m]]++;
    for (let k = data.capOffset[m]; k < data.capOffset[m + 1]; k++) live[data.capColor[k]]--;
  }
  return live;
}

describe("colorDistribution", () => {
  it("empty data yields zero-length rows and no NaN", () => {
    const d = colorDistribution(computeGoMoves([], 0), 16);
    expect(d.samples).toBe(1);
    expect(d.colorCount).toBe(0);
    expect(d.counts.length).toBe(0);
    expect([...d.turns].every((t) => Number.isFinite(t))).toBe(true);
  });

  it("counts at each sampled turn match a brute-force live-count replay", () => {
    const data = computeGoMoves([BLACK, WHITE], 500);
    const d = colorDistribution(data, 64);
    const C = d.colorCount;
    expect(C).toBe(2);
    for (let i = 0; i < d.samples; i++) {
      const brute = liveAt(data, d.turns[i]);
      for (let c = 0; c < C; c++) expect(d.counts[i * C + c]).toBe(brute[c]);
    }
  });

  it("each sampled row sums to live stones (moves − captures) at that turn", () => {
    const data = computeGoMoves([BLACK, WHITE, "#cf2f2a"], 400);
    const d = colorDistribution(data, 50);
    const C = d.colorCount;
    for (let i = 0; i < d.samples; i++) {
      const t = d.turns[i];
      let rowSum = 0;
      for (let c = 0; c < C; c++) rowSum += d.counts[i * C + c];
      expect(rowSum).toBe(t - data.capOffset[t]);
    }
  });

  it("the final sample is the last turn, and samples never exceed the move count", () => {
    const data = computeGoMoves([BLACK, WHITE], 30);
    const d = colorDistribution(data, 200); // more samples than moves
    expect(d.samples).toBe(30);
    expect(d.turns[d.samples - 1]).toBe(30);
    const fewer = colorDistribution(data, 10);
    expect(fewer.samples).toBe(10);
    expect(fewer.turns[fewer.samples - 1]).toBe(30);
  });
});
