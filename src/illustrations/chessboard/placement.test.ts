import { describe, expect, it } from "vitest";
import { defaultPieces, knightOffsets } from "./pieces";
import { computePlacements, packPlacements } from "./placement";
import { coordToIndex, indexToCoord } from "./spiral";
import type { Piece, Placement } from "./types";

function attacks(p: Placement, byOffsets: Map<string, [number, number][]>): string[] {
  const offs = byOffsets.get(p.pieceId) ?? [];
  return offs.map(([dx, dy]) => `${p.coord.x + dx},${p.coord.y + dy}`);
}

describe("computePlacements", () => {
  it("single color fills cells in pure spiral order", () => {
    const pieces: Piece[] = [
      { id: "p1", color: "#000", gridSize: 5, offsets: knightOffsets(), weight: 1 },
    ];
    const placements = computePlacements(pieces, "round-robin", 12);
    expect(placements.map((p) => p.index)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  });

  it("first two default-knight placements are center then its right neighbor", () => {
    const placements = computePlacements(defaultPieces(), "round-robin", 2);
    expect(placements[0]).toMatchObject({ index: 1, coord: { x: 0, y: 0 }, color: "#000000" });
    expect(placements[1]).toMatchObject({ index: 2, coord: { x: 1, y: 0 }, color: "#e10600" });
  });

  it("invariant: no placement sits on a cell attacked by a different color", () => {
    const pieces = defaultPieces();
    const byOffsets = new Map(pieces.map((p) => [p.id, p.offsets]));
    const placements = computePlacements(pieces, "round-robin", 300);
    const attacked = new Map<string, Set<string>>(); // cellKey -> colors attacking it
    const occupied = new Set<string>();
    for (const p of placements) {
      const cellKey = `${p.coord.x},${p.coord.y}`;
      const enemies = attacked.get(cellKey);
      if (enemies) {
        for (const color of enemies) expect(color).toBe(p.color);
      }
      expect(occupied.has(cellKey)).toBe(false);
      occupied.add(cellKey);
      for (const target of attacks(p, byOffsets)) {
        if (!attacked.has(target)) attacked.set(target, new Set());
        attacked.get(target)?.add(p.color);
      }
    }
  });

  it("invariant: each placement is the lowest valid spiral index at its step", () => {
    const pieces = defaultPieces();
    const byOffsets = new Map(pieces.map((p) => [p.id, p.offsets]));
    const placements = computePlacements(pieces, "round-robin", 120);
    const attacked = new Map<string, Set<string>>();
    const occupied = new Set<string>();
    for (const p of placements) {
      // every spiral index below p.index must be invalid for p.color at this step
      for (let n = 1; n < p.index; n++) {
        const c = indexToCoord(n);
        const key = `${c.x},${c.y}`;
        const isOccupied = occupied.has(key);
        const enemy = [...(attacked.get(key) ?? [])].some((col) => col !== p.color);
        expect(isOccupied || enemy).toBe(true);
      }
      const cellKey = `${p.coord.x},${p.coord.y}`;
      occupied.add(cellKey);
      expect(coordToIndex(p.coord.x, p.coord.y)).toBe(p.index);
      for (const [dx, dy] of byOffsets.get(p.pieceId) ?? []) {
        const tk = `${p.coord.x + dx},${p.coord.y + dy}`;
        if (!attacked.has(tk)) attacked.set(tk, new Set());
        attacked.get(tk)?.add(p.color);
      }
    }
  });

  it("returns empty for no pieces", () => {
    expect(computePlacements([], "round-robin", 10)).toEqual([]);
  });

  it("reports progress and finishes at the total", () => {
    const seen: number[] = [];
    computePlacements(defaultPieces(), "round-robin", 30, (done) => seen.push(done));
    expect(seen.at(-1)).toBe(30);
    expect(seen.every((n) => n >= 0 && n <= 30)).toBe(true);
  });
});

describe("packPlacements", () => {
  it("packs coords and dedupes colors into an index", () => {
    const placements = computePlacements(defaultPieces(), "round-robin", 6);
    const packed = packPlacements(placements);
    expect(packed.count).toBe(6);
    expect(packed.xs.length).toBe(6);
    expect(packed.ys.length).toBe(6);
    // Two default colors → palette of 2, indices in {0,1}.
    expect(packed.colors.length).toBe(2);
    placements.forEach((p, i) => {
      expect(packed.xs[i]).toBe(p.coord.x);
      expect(packed.ys[i]).toBe(p.coord.y);
      expect(packed.colors[packed.colorIndex[i]]).toBe(p.color);
    });
  });
});
