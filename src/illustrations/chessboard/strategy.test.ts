import { describe, expect, it } from "vitest";
import { createPicker } from "./strategy";
import type { Piece } from "./types";

function piece(id: string, weight: number): Piece {
  return { id, color: "#000", gridSize: 5, offsets: [], weight };
}

function take(kind: "round-robin" | "weighted", pieces: Piece[], n: number): string[] {
  const picker = createPicker(kind, pieces);
  return Array.from({ length: n }, () => picker.next().id);
}

describe("strategy", () => {
  it("round-robin cycles in list order", () => {
    const ids = take("round-robin", [piece("a", 1), piece("b", 1), piece("c", 1)], 7);
    expect(ids).toEqual(["a", "b", "c", "a", "b", "c", "a"]);
  });

  it("weighted respects the 2:1 ratio deterministically", () => {
    const ids = take("weighted", [piece("a", 2), piece("b", 1)], 6);
    expect(ids).toEqual(["a", "b", "a", "a", "b", "a"]);
    expect(ids.filter((x) => x === "a").length).toBe(4);
    expect(ids.filter((x) => x === "b").length).toBe(2);
  });
});
