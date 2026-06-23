import type { Dir, DockSpec, Pt, Segment, Shape } from "./types";

export type ShapePreset = { name: string; outDocks: DockSpec[]; visual: Segment[] };

const E: Dir = 0;
const N: Dir = 2;
const W: Dir = 4;
const S: Dir = 6;

// Point in the exact (p,q,r,s) basis (p·E + q·NE + r·N + s·NW).
function pt(p: number, q: number, r: number, s: number): Pt {
  return { p, q, r, s };
}
const O = pt(0, 0, 0, 0);

// Authored in the canonical frame: in-dock at the origin, growth arriving from the
// West (incoming direction East). Logic = outDocks; `visual` is cosmetic. STRAIGHT
// reproduces A139250 exactly and must not change.
export const STRAIGHT: ShapePreset = {
  name: "Straight",
  outDocks: [
    { at: pt(0, 0, 1, 0), dir: N },
    { at: pt(0, 0, -1, 0), dir: S },
  ],
  visual: [{ a: pt(0, 0, -1, 0), b: pt(0, 0, 1, 0) }],
};

export const TEE: ShapePreset = {
  name: "T",
  outDocks: [
    { at: pt(0, 0, 1, 0), dir: N },
    { at: pt(0, 0, -1, 0), dir: S },
    { at: pt(1, 0, 0, 0), dir: E },
  ],
  visual: [
    { a: pt(0, 0, -1, 0), b: pt(0, 0, 1, 0) },
    { a: O, b: pt(1, 0, 0, 0) },
  ],
};

export const BEND: ShapePreset = {
  name: "Bend",
  outDocks: [{ at: pt(1, 0, 1, 0), dir: N }],
  visual: [
    { a: O, b: pt(1, 0, 0, 0) },
    { a: pt(1, 0, 0, 0), b: pt(1, 0, 1, 0) },
  ],
};

export const CROSS: ShapePreset = {
  name: "Cross",
  outDocks: [
    { at: pt(0, 0, 1, 0), dir: N },
    { at: pt(0, 0, -1, 0), dir: S },
    { at: pt(1, 0, 0, 0), dir: E },
    { at: pt(-1, 0, 0, 0), dir: W },
  ],
  visual: [
    { a: pt(0, 0, -1, 0), b: pt(0, 0, 1, 0) },
    { a: pt(-1, 0, 0, 0), b: pt(1, 0, 0, 0) },
  ],
};

// Opposite-handed right-angle bend (turns down instead of up).
export const BEND_L: ShapePreset = {
  name: "Bend L",
  outDocks: [{ at: pt(1, 0, -1, 0), dir: S }],
  visual: [
    { a: O, b: pt(1, 0, 0, 0) },
    { a: pt(1, 0, 0, 0), b: pt(1, 0, -1, 0) },
  ],
};

// L with unequal arms: a length-1 forward arm then a length-2 perpendicular arm.
export const LONG_L: ShapePreset = {
  name: "Long-L",
  outDocks: [{ at: pt(1, 0, 2, 0), dir: N }],
  visual: [
    { a: O, b: pt(1, 0, 0, 0) },
    { a: pt(1, 0, 0, 0), b: pt(1, 0, 2, 0) },
  ],
};

export const SHAPE_PRESETS: ShapePreset[] = [STRAIGHT, TEE, BEND, BEND_L, LONG_L, CROSS];

// Distinct, muted hues that read on the dotted backdrop in both themes.
export const PALETTE = ["#0e7490", "#b45309", "#1f7a4d", "#6d28d9", "#be185d", "#1d4ed8"];

function shapeKey(outDocks: DockSpec[], visual: Segment[]): string {
  return JSON.stringify({ outDocks, visual });
}

export function presetNameFor(shape: { outDocks: DockSpec[]; visual: Segment[] }): string {
  const key = shapeKey(shape.outDocks, shape.visual);
  const match = SHAPE_PRESETS.find((p) => shapeKey(p.outDocks, p.visual) === key);
  return match ? match.name : "Custom";
}

export function defaultShapes(): Shape[] {
  return [
    {
      id: "s1",
      name: STRAIGHT.name,
      color: "#0e7490",
      weight: 1,
      outDocks: STRAIGHT.outDocks,
      visual: STRAIGHT.visual,
    },
    {
      id: "s2",
      name: STRAIGHT.name,
      color: "#b45309",
      weight: 1,
      outDocks: STRAIGHT.outDocks,
      visual: STRAIGHT.visual,
    },
  ];
}
