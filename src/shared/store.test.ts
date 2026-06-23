import { describe, expect, it, vi } from "vitest";
import { createStore } from "./store";

describe("createStore", () => {
  it("gets and patches state, notifying subscribers", () => {
    const store = createStore({ count: 0, label: "a" });
    const seen: number[] = [];
    const unsub = store.subscribe((s) => seen.push(s.count));
    store.set({ count: 1 });
    store.set((s) => ({ count: s.count + 1 }));
    expect(store.get()).toEqual({ count: 2, label: "a" });
    expect(seen).toEqual([1, 2]);
    unsub();
    store.set({ count: 9 });
    expect(seen).toEqual([1, 2]);
  });

  it("supports multiple subscribers", () => {
    const store = createStore({ n: 0 });
    const a = vi.fn();
    const b = vi.fn();
    store.subscribe(a);
    store.subscribe(b);
    store.set({ n: 1 });
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);
  });
});
