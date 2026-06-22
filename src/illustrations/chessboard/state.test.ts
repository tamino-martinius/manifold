import { describe, expect, it } from "vitest";
import { createChessboardStore, recomputePlacements } from "./state";

describe("chessboard state", () => {
  it("initializes with default pieces and precomputed placements", () => {
    const store = createChessboardStore();
    const s = store.get();
    expect(s.pieces.length).toBe(2);
    expect(s.strategy).toBe("round-robin");
    expect(s.placements.length).toBe(s.maxPieces);
    expect(s.frame).toBe(0);
  });

  it("recompute clamps frame within new placement bounds", () => {
    const store = createChessboardStore();
    store.set({ frame: 999999 });
    store.set({ maxPieces: 50 });
    recomputePlacements(store);
    const s = store.get();
    expect(s.placements.length).toBe(50);
    expect(s.frame).toBeLessThanOrEqual(50);
  });
});
