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
  it("exposes the named presets including a 3- and 4-player pattern", () => {
    const names = PATTERN_PRESETS.map((p) => p.name);
    expect(names).toContain("Standard");
    expect(names).toContain("Three players");
    expect(PATTERN_PRESETS.find((p) => p.name === "Four players")?.pattern).toHaveLength(4);
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
