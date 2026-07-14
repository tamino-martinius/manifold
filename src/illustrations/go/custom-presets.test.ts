import { describe, expect, it } from "vitest";
import { parseCustomPresets } from "./custom-presets";

describe("parseCustomPresets", () => {
  it("returns [] for null, empty, or non-JSON input", () => {
    expect(parseCustomPresets(null)).toEqual([]);
    expect(parseCustomPresets("")).toEqual([]);
    expect(parseCustomPresets("not json")).toEqual([]);
  });

  it("returns [] when the top level is not an array", () => {
    expect(parseCustomPresets('{"a":1}')).toEqual([]);
    expect(parseCustomPresets('"#171717"')).toEqual([]);
  });

  it("keeps valid patterns (non-empty arrays of #rrggbb hexes)", () => {
    const raw = JSON.stringify([
      ["#171717", "#f4efe4"],
      ["#171717", "#f4efe4", "#2f9e57"],
    ]);
    expect(parseCustomPresets(raw)).toEqual([
      ["#171717", "#f4efe4"],
      ["#171717", "#f4efe4", "#2f9e57"],
    ]);
  });

  it("drops entries that are not arrays, are empty, or hold bad colors", () => {
    const raw = JSON.stringify([
      ["#171717", "#f4efe4"], // valid
      [], // empty
      "nope", // not an array
      ["#171717", "red"], // non-hex member
      ["#12345"], // wrong length
      ["#171717", 42], // non-string member
    ]);
    expect(parseCustomPresets(raw)).toEqual([["#171717", "#f4efe4"]]);
  });
});
