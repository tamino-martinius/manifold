import { describe, expect, it } from "vitest";
import { createChessboardStore } from "./state";

describe("chessboard state", () => {
  it("initializes with default pieces, auto-play, and empty placed data pending compute", () => {
    const store = createChessboardStore();
    const s = store.get();
    expect(s.pieces.length).toBe(2);
    expect(s.strategy).toBe("round-robin");
    expect(s.frame).toBe(0);
    expect(s.playing).toBe(true);
    // Placement data is computed asynchronously by the worker, so it starts empty.
    expect(s.placed.count).toBe(0);
    expect(s.loading).toBe(true);
  });
});
