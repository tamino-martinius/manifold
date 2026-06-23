import { describe, expect, it, vi } from "vitest";
import { createToothpickEngine } from "./engine";
import { STRAIGHT } from "./presets";
import { createToothpickStore } from "./state";

describe("createToothpickEngine (synchronous fallback)", () => {
  it("computes placements into the store after the debounce", () => {
    vi.useFakeTimers();
    const store = createToothpickStore();
    // Single Straight shape so the count is the known A139250(4) = 11.
    store.set({
      shapes: [
        {
          id: "s",
          name: "Straight",
          color: "#000",
          weight: 1,
          outDocks: STRAIGHT.outDocks,
          visual: STRAIGHT.visual,
        },
      ],
      maxGen: 4,
    });
    const engine = createToothpickEngine(store);
    engine.recompute();
    vi.advanceTimersByTime(200);
    expect(store.get().loading).toBe(false);
    expect(store.get().placed.count).toBe(11);
    engine.dispose();
    vi.useRealTimers();
  });
});
