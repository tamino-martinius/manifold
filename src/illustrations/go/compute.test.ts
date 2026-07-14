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

// FNV-1a over a typed array — a compact fingerprint of the full delta stream.
function checksum(a: ArrayLike<number>): string {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < a.length; i++) {
    h ^= a[i] & 0xffffffff;
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h.toString(16);
}

// Golden fingerprints of the exact delta stream, captured from the reviewed
// baseline. They guard against any change silently altering which cells get
// played/captured (e.g. a future perf tweak to the Go-rules flood-fill). If a
// deliberate rule change lands, recompute and update these.
describe("computeGoMoves golden output", () => {
  const cases: { name: string; pattern: string[]; n: number; sig: string }[] = [
    {
      name: "black/white × 2000",
      pattern: [BLACK, WHITE],
      n: 2000,
      sig: "2000 7cfa8c12 8394eaaf cfb8dfa5 dcd7ab77 23802684 a273da3a 7dc4aa52 f3726831 aa8c4eb1",
    },
    {
      name: "black/white × 20000",
      pattern: [BLACK, WHITE],
      n: 20000,
      sig: "20000 4471ef37 9047287f 29fda885 bbca505c f2c79c07 c010aee0 e23afa35 6013e6af 1a3615dd",
    },
    {
      name: "black/white/red × 1500",
      pattern: [BLACK, WHITE, "#cf2f2a"],
      n: 1500,
      sig: "1500 2b832ea3 2c6d729d 692d0361 b448aaed 934bffa9 5826053 3898f836 95466fed 2766e1a2",
    },
  ];
  for (const c of cases) {
    it(`is stable for ${c.name}`, () => {
      const d = computeGoMoves(c.pattern, c.n);
      const sig = [
        d.count,
        checksum(d.placedX),
        checksum(d.placedY),
        checksum(d.placedColor),
        checksum(d.capOffset),
        checksum(d.capX),
        checksum(d.capY),
        checksum(d.capColor),
        checksum(d.halfX),
        checksum(d.halfY),
      ].join(" ");
      expect(sig).toBe(c.sig);
    });
  }
});
