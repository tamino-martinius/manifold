import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createEngine } from "./engine";
import { EMPTY_GO_DATA, createGoStore } from "./state";

// Minimal Worker stand-in so the engine's cancellation logic is testable in node:
// records posts + terminate, and lets the test deliver messages manually.
class MockWorker {
  static instances: MockWorker[] = [];
  posted: { token: number }[] = [];
  terminated = false;
  onmessage: ((e: MessageEvent) => void) | null = null;
  constructor() {
    MockWorker.instances.push(this);
  }
  postMessage(msg: { token: number }): void {
    this.posted.push(msg);
  }
  terminate(): void {
    this.terminated = true;
  }
}

describe("createEngine worker cancellation", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    MockWorker.instances = [];
    (globalThis as unknown as { Worker: unknown }).Worker = MockWorker;
  });
  afterEach(() => {
    vi.useRealTimers();
    (globalThis as unknown as { Worker: unknown }).Worker = undefined;
  });

  it("terminates the in-flight worker when a new request supersedes it", () => {
    const engine = createEngine(createGoStore());
    expect(MockWorker.instances).toHaveLength(1); // warmed up front
    const w1 = MockWorker.instances[0];

    engine.recompute();
    vi.advanceTimersByTime(140);
    expect(w1.posted).toHaveLength(1); // busy: request in flight, no `done` yet

    engine.recompute(); // supersede while still busy
    vi.advanceTimersByTime(140);

    expect(w1.terminated).toBe(true); // stale computation aborted
    expect(MockWorker.instances).toHaveLength(2); // fresh worker spawned
    expect(MockWorker.instances[1].posted).toHaveLength(1); // only the latest runs
    engine.dispose();
  });

  it("reuses the worker (no terminate) once the previous request has finished", () => {
    const engine = createEngine(createGoStore());
    const w1 = MockWorker.instances[0];

    engine.recompute();
    vi.advanceTimersByTime(140);
    const { token } = w1.posted[0];
    // Worker reports done → engine clears busy.
    w1.onmessage?.({ data: { type: "done", token, data: EMPTY_GO_DATA } } as MessageEvent);

    engine.recompute();
    vi.advanceTimersByTime(140);
    expect(w1.terminated).toBe(false); // not superseded → not terminated
    expect(MockWorker.instances).toHaveLength(1); // same worker reused
    expect(w1.posted).toHaveLength(2);
    engine.dispose();
  });
});
