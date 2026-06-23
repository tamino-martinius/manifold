import { describe, expect, it } from "vitest";
import { createPicker } from "./strategy";
import type { Shape } from "./types";

const mk = (id: string, weight = 1): Shape => ({
  id,
  name: id,
  color: "#000",
  weight,
  outDocks: [],
  visual: [],
});

describe("createPicker", () => {
  it("round-robin cycles shapes in order", () => {
    const p = createPicker("round-robin", [mk("a"), mk("b")]);
    expect([p.next().id, p.next().id, p.next().id, p.next().id]).toEqual(["a", "b", "a", "b"]);
  });

  it("weighted distributes proportionally to weight", () => {
    const p = createPicker("weighted", [mk("a", 3), mk("b", 1)]);
    const seq = [p.next().id, p.next().id, p.next().id, p.next().id];
    expect(seq.filter((x) => x === "a")).toHaveLength(3);
    expect(seq.filter((x) => x === "b")).toHaveLength(1);
  });

  it("throws when there are no shapes", () => {
    expect(() => createPicker("round-robin", [])).toThrow();
  });
});
