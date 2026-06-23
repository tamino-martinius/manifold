import { describe, expect, it } from "vitest";
import { cellShade } from "./renderer";

describe("cellShade", () => {
  it("alternates by coordinate parity", () => {
    expect(cellShade(0, 0)).toBe(cellShade(1, 1));
    expect(cellShade(0, 0)).not.toBe(cellShade(1, 0));
    expect(cellShade(0, 0)).not.toBe(cellShade(0, 1));
  });
});
