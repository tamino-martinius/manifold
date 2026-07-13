import { groupThousands } from "../../shared/format";

/**
 * Ease `current` toward `target` by a frame-rate-independent exponential step
 * (CountTo-style ease-out to a moving target). `dt` is clamped so a long stall
 * cannot jump. Unlike the camera's easeScale there is no snap-from-nothing
 * sentinel — 0 is a valid value — but the result snaps exactly onto the target
 * within 0.5 so the displayed integer lands cleanly.
 */
export function approach(current: number, target: number, dt: number, rate = 9): number {
  if (current === target) return target;
  const k = 1 - Math.exp(-rate * Math.min(Math.max(dt, 0), 0.1));
  const next = current + (target - current) * k;
  return Math.abs(next - target) < 0.5 ? target : next;
}

/**
 * A DOM counter whose displayed integer eases toward a moving target. `tick`
 * advances one step and rewrites the element only when the grouped text changes.
 */
export function createCounter(className = "go-count-value"): {
  el: HTMLElement;
  tick(target: number, dt: number): void;
} {
  const el = document.createElement("span");
  el.className = className;
  el.textContent = "0";
  let value = 0;
  let shown = "0";
  return {
    el,
    tick(target, dt) {
      value = approach(value, target, dt);
      const text = groupThousands(Math.round(value));
      if (text !== shown) {
        shown = text;
        el.textContent = text;
      }
    },
  };
}
