import { describe, expect, it } from "vitest";
import { EMPTY_PLACED, createToothpickStore } from "./state";

describe("createToothpickStore", () => {
  it("starts with the default config", () => {
    const s = createToothpickStore().get();
    expect(s.maxGen).toBe(64);
    expect(s.strategy).toBe("round-robin");
    expect(s.shapes).toHaveLength(2);
    expect(s.speed).toBe(30);
    expect(s.playing).toBe(true);
    expect(s.placed).toBe(EMPTY_PLACED);
    expect(s.placed.count).toBe(0);
  });

  it("applies partial updates via the store", () => {
    const store = createToothpickStore();
    store.set({ maxGen: 12 });
    expect(store.get().maxGen).toBe(12);
  });
});
