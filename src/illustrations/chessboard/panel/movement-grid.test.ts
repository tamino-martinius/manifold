import { describe, expect, it } from "vitest";
import { toggleOffset } from "./movement-grid";

describe("toggleOffset", () => {
  it("adds an absent offset", () => {
    const next = toggleOffset([[1, 2]], 2, 1);
    expect(next).toContainEqual([2, 1]);
    expect(next.length).toBe(2);
  });

  it("removes a present offset without mutating the input", () => {
    const input: [number, number][] = [
      [1, 2],
      [2, 1],
    ];
    const next = toggleOffset(input, 1, 2);
    expect(next).toEqual([[2, 1]]);
    expect(input.length).toBe(2);
  });
});
