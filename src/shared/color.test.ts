import { describe, expect, it } from "vitest";
import { colorDistance, hexToRgb, pickDistinctColor } from "./color";

describe("color", () => {
  it("parses 3- and 6-digit hex", () => {
    expect(hexToRgb("#000000")).toEqual([0, 0, 0]);
    expect(hexToRgb("#ffffff")).toEqual([255, 255, 255]);
    expect(hexToRgb("#f00")).toEqual([255, 0, 0]);
  });

  it("colorDistance is 0 for equal colors and positive otherwise", () => {
    expect(colorDistance("#123456", "#123456")).toBe(0);
    expect(colorDistance("#000000", "#ffffff")).toBeGreaterThan(0);
  });

  it("pickDistinctColor avoids hues close to existing ones", () => {
    // existing has black + red; the red-ish palette entry must not be chosen.
    const existing = ["#000000", "#e10600"];
    const palette = ["#ff5b47", "#3ddc84", "#22d3ee"];
    expect(pickDistinctColor(existing, palette)).not.toBe("#ff5b47");
  });

  it("pickDistinctColor returns the first palette entry when nothing exists", () => {
    expect(pickDistinctColor([], ["#3ddc84", "#22d3ee"])).toBe("#3ddc84");
  });
});
