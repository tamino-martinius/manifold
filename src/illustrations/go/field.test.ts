import { describe, expect, it } from "vitest";
import { type Field, createField } from "./field";

// Build a field with the given stones placed. Each stone is [x, y, colorIdx];
// the field stores colorIdx + 1 (0 = empty).
function fieldWith(radius: number, stones: [number, number, number][]): Field {
  const f = createField(radius);
  for (const [x, y, c] of stones) f.set(f.index(x, y), c + 1);
  return f;
}

describe("createField coords", () => {
  it("round-trips index / xOf / yOf including negatives", () => {
    const f = createField(8);
    for (const [x, y] of [
      [0, 0],
      [5, -3],
      [-7, 2],
      [-8, 8],
    ] as [number, number][]) {
      const idx = f.index(x, y);
      expect(f.xOf(idx)).toBe(x);
      expect(f.yOf(idx)).toBe(y);
    }
  });
});

describe("createField.resolveAt", () => {
  it("captures a single enemy stone reduced to zero liberties", () => {
    // White (1) at origin, black (0) on 3 sides; black plays the 4th and captures.
    const f = fieldWith(6, [
      [0, 0, 1],
      [1, 0, 0],
      [-1, 0, 0],
      [0, 1, 0],
    ]);
    const idx = f.index(0, -1);
    const { legal, count } = f.resolveAt(idx, 0 + 1);
    expect(legal).toBe(true);
    expect(count).toBe(1);
    expect(f.captured[0]).toBe(f.index(0, 0));
    // Non-mutating: the tentative stone is gone, the captured enemy still present.
    expect(f.colorAt(idx)).toBe(0);
    expect(f.colorAt(f.index(0, 0))).toBe(1 + 1);
  });

  it("captures a multi-stone enemy group at once", () => {
    // White group {(0,0),(1,0)} surrounded by black except one point; black fills it.
    const f = fieldWith(6, [
      [0, 0, 1],
      [1, 0, 1],
      [-1, 0, 0],
      [0, 1, 0],
      [1, 1, 0],
      [2, 0, 0],
      [1, -1, 0],
    ]);
    const { legal, count } = f.resolveAt(f.index(0, -1), 0 + 1);
    expect(legal).toBe(true);
    expect(count).toBe(2);
    expect(new Set([...f.captured.slice(0, count)])).toEqual(
      new Set([f.index(0, 0), f.index(1, 0)]),
    );
  });

  it("rejects suicide (no liberties, no capture)", () => {
    const f = fieldWith(6, [
      [1, 0, 0],
      [-1, 0, 0],
      [0, 1, 0],
      [0, -1, 0],
    ]);
    const { legal, count } = f.resolveAt(f.index(0, 0), 1 + 1);
    expect(legal).toBe(false);
    expect(count).toBe(0);
    expect(f.colorAt(f.index(0, 0))).toBe(0); // unchanged
  });

  it("allows an otherwise-suicidal move BECAUSE it captures (capture resolved first)", () => {
    // White plays (0,0) with all four neighbours black — its lone stone has zero
    // liberties on its own. Black (1,0) is in atari (only liberty is (0,0)), so the
    // move captures it and (0,0) gains that liberty; the other three black stones
    // keep outside liberties and survive. A suicide-before-capture rule would
    // wrongly reject this — that is the ordering this test locks down.
    const f = fieldWith(6, [
      [1, 0, 0], // black in atari — the only stone captured
      [-1, 0, 0],
      [0, 1, 0],
      [0, -1, 0],
      [2, 0, 1],
      [1, 1, 1],
      [1, -1, 1],
    ]);
    const { legal, count } = f.resolveAt(f.index(0, 0), 1 + 1);
    expect(legal).toBe(true);
    expect(count).toBe(1);
    expect(f.captured[0]).toBe(f.index(1, 0));
  });

  it("is legal with a plain liberty and captures nothing", () => {
    const f = fieldWith(6, [[1, 0, 1]]);
    const { legal, count } = f.resolveAt(f.index(0, 0), 0 + 1);
    expect(legal).toBe(true);
    expect(count).toBe(0);
  });
});
