import { describe, expect, it } from "vitest";
import {
  DEFAULT_PATTERN,
  GO_PALETTE,
  PATTERN_PRESETS,
  nextAddColor,
  playerColors,
} from "./pattern";

describe("pattern model", () => {
  it("defaults to black, white", () => {
    expect(DEFAULT_PATTERN).toEqual(["#171717", "#f4efe4"]);
  });
  it("palette holds twelve distinct hexes including black and white", () => {
    expect(GO_PALETTE).toHaveLength(12);
    expect(new Set(GO_PALETTE).size).toBe(12);
    expect(GO_PALETTE).toContain("#171717");
    expect(GO_PALETTE).toContain("#f4efe4");
  });
  it("exposes the seven named presets with the expected color orders", () => {
    const byName = new Map(PATTERN_PRESETS.map((p) => [p.name, p.pattern]));
    expect([...byName.keys()]).toEqual([
      "Standard",
      "3 players",
      "4 players",
      "5 players",
      "Mirror",
      "Mirror 3",
      "Mirror 4",
    ]);
    const B = "#171717";
    const W = "#f4efe4";
    const G = "#2f9e57";
    const R = "#cf2f2a";
    const L = "#2f6fdb";
    expect(byName.get("Standard")).toEqual([B, W]);
    expect(byName.get("5 players")).toEqual([B, W, G, R, L]);
    expect(byName.get("Mirror")).toEqual([B, W, W, B]);
    expect(byName.get("Mirror 4")).toEqual([B, W, W, B, G, R]);
  });
  it("playerColors returns distinct colors in first-seen order", () => {
    expect(playerColors(["#171717", "#f4efe4", "#171717", "#cf2f2a"])).toEqual([
      "#171717",
      "#f4efe4",
      "#cf2f2a",
    ]);
  });
  it("nextAddColor picks the first palette color not already in the pattern", () => {
    expect(nextAddColor(["#171717", "#f4efe4"])).toBe("#cf2f2a");
    expect(nextAddColor([])).toBe("#171717");
  });
  it("nextAddColor falls back to the first palette color when all are used", () => {
    expect(nextAddColor([...GO_PALETTE])).toBe("#171717");
  });
});
