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

  it("clamps frame to the generation count (not the instance count) on recompute", () => {
    vi.useFakeTimers();
    const store = createToothpickStore();
    const single = {
      id: "s",
      name: "Straight",
      color: "#000",
      weight: 1,
      outDocks: STRAIGHT.outDocks,
      visual: STRAIGHT.visual,
    };
    const engine = createToothpickEngine(store);

    store.set({ shapes: [single], maxGen: 8 });
    engine.recompute();
    vi.advanceTimersByTime(200);
    store.set({ frame: 8 }); // user scrubbed to the last stage

    // Shrinking maxGen shrinks the generation count; frame must follow it down,
    // even though the instance count (placed.count) is still far larger.
    store.set({ maxGen: 3 });
    engine.recompute();
    vi.advanceTimersByTime(200);
    expect(store.get().placed.genSegEnds.length).toBe(3);
    expect(store.get().frame).toBeLessThanOrEqual(store.get().placed.genSegEnds.length);

    engine.dispose();
    vi.useRealTimers();
  });
});
