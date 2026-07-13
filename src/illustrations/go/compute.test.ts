import { describe, expect, it } from "vitest";
import { computeGoMoves } from "./compute";
import { cellKey } from "./gorules";

const BLACK = "#171717";
const WHITE = "#f4efe4";

// Rebuild the board (cellKey -> colorIdx) after the first `n` moves by replaying
// the deltas, so tests can assert on realized positions.
function boardAt(data: ReturnType<typeof computeGoMoves>, n: number): Map<number, number> {
  const b = new Map<number, number>();
  for (let m = 0; m < n; m++) {
    b.set(cellKey(data.placedX[m], data.placedY[m]), data.placedColor[m]);
    for (let k = data.capOffset[m]; k < data.capOffset[m + 1]; k++) {
      b.delete(cellKey(data.capX[k], data.capY[k]));
    }
  }
  return b;
}

describe("computeGoMoves", () => {
  it("returns empty data for empty pattern or zero moves", () => {
    expect(computeGoMoves([], 10).count).toBe(0);
    expect(computeGoMoves([BLACK], 0).count).toBe(0);
  });

  it("registers colors in first-seen order and cycles the pattern", () => {
    const data = computeGoMoves([BLACK, WHITE], 6);
    expect(data.count).toBe(6);
    expect(data.colors).toEqual([BLACK, WHITE]);
    // Turn parity → color: even = black(0), odd = white(1).
    for (let m = 0; m < 6; m++) expect(data.placedColor[m]).toBe(m % 2);
  });

  it("places the first stone at the spiral origin (cell 1)", () => {
    const data = computeGoMoves([BLACK, WHITE], 1);
    expect(data.placedX[0]).toBe(0);
    expect(data.placedY[0]).toBe(0);
  });

  it("captures the origin stone and records the capture delta", () => {
    // With [black, white] the greedy fill surrounds and captures black@origin on
    // move 8 (0-based move index 7). Verify a capture is recorded and the origin
    // is empty immediately after that move.
    const data = computeGoMoves([BLACK, WHITE], 8);
    const totalCaps = data.capOffset[data.count];
    expect(totalCaps).toBeGreaterThan(0);
    const b = boardAt(data, 8);
    expect(b.has(cellKey(0, 0))).toBe(false);
  });

  it("never occupies more cells than moves, and stones = moves − captures", () => {
    const data = computeGoMoves([BLACK, WHITE], 200);
    const b = boardAt(data, 200);
    expect(b.size).toBe(200 - data.capOffset[200]);
  });

  it("tracks a monotonic non-decreasing camera half-extent", () => {
    const data = computeGoMoves([BLACK, WHITE], 300);
    for (let m = 1; m < data.count; m++) {
      expect(data.halfX[m]).toBeGreaterThanOrEqual(data.halfX[m - 1]);
      expect(data.halfY[m]).toBeGreaterThanOrEqual(data.halfY[m - 1]);
    }
  });

  it("reports progress and terminates for a 3-player pattern", () => {
    const seen: number[] = [];
    const data = computeGoMoves([BLACK, WHITE, "#cf2f2a"], 5000, (d) => seen.push(d));
    expect(data.count).toBe(5000);
    expect(data.colors).toHaveLength(3);
    expect(seen[seen.length - 1]).toBe(5000);
  });
});
