import type { Dir, DockSpec, Pt, Segment, Shape } from "./types";

// `hidden` presets stay in the code (and resolve via presetNameFor) but are not
// offered in the picker dropdown — used to park shapes that don't read well yet.
export type ShapePreset = {
  name: string;
  outDocks: DockSpec[];
  visual: Segment[];
  hidden?: boolean;
};

const E: Dir = 0;
const NE: Dir = 1;
const N: Dir = 2;
const NW: Dir = 3;
const W: Dir = 4;
const SW: Dir = 5;
const S: Dir = 6;
const SE: Dir = 7;

// Point in the exact (p,q,r,s) basis (p·E + q·NE + r·N + s·NW).
function pt(p: number, q: number, r: number, s: number): Pt {
  return { p, q, r, s };
}
const O = pt(0, 0, 0, 0);

// Reflect a point across the growth (East) axis — screen (x, y) -> (x, -y). In the
// basis that is (p, q, r, s) -> (p, -s, -r, -q).
function mirrorPt(p: Pt): Pt {
  // `|| 0` normalises the -0 that negating a 0 component produces.
  return { p: p.p, q: -p.s || 0, r: -p.r || 0, s: -p.q || 0 };
}
// Reflect a direction across the East axis (E↔E, N↔S, NE↔SE, NW↔SW, W↔W).
function mirrorDir(d: Dir): Dir {
  return ((8 - d) & 7) as Dir;
}
// A preset of the opposite handedness — used to offer chiral shapes in both
// orientations (rotation is already handled by growth; reflection is not).
function mirror(preset: ShapePreset, name: string): ShapePreset {
  return {
    name,
    hidden: preset.hidden,
    outDocks: preset.outDocks.map((d) => ({ at: mirrorPt(d.at), dir: mirrorDir(d.dir) })),
    visual: preset.visual.map((s) => ({ a: mirrorPt(s.a), b: mirrorPt(s.b) })),
  };
}

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

// The opposite-handed Bend (mirror across the East axis — turns down, not up).
export const BEND_MIRRORED: ShapePreset = mirror(BEND, "Bend Mirrored");

// L with unequal arms: a length-1 forward arm then a length-2 perpendicular arm.
export const LONG_L: ShapePreset = {
  name: "Long-L",
  outDocks: [{ at: pt(1, 0, 2, 0), dir: N }],
  visual: [
    { a: O, b: pt(1, 0, 0, 0) },
    { a: pt(1, 0, 0, 0), b: pt(1, 0, 2, 0) },
  ],
};
export const LONG_L_MIRRORED: ShapePreset = mirror(LONG_L, "Long-L Mirrored");

// Y — trident: a forward stem to a junction, a perpendicular crossbar, then two
// parallel forward prongs. Two forward out-docks at the prong tips.
export const Y: ShapePreset = {
  name: "Y",
  outDocks: [
    { at: pt(2, 0, 1, 0), dir: E },
    { at: pt(2, 0, -1, 0), dir: E },
  ],
  visual: [
    { a: O, b: pt(1, 0, 0, 0) },
    { a: pt(1, 0, -1, 0), b: pt(1, 0, 1, 0) },
    { a: pt(1, 0, 1, 0), b: pt(2, 0, 1, 0) },
    { a: pt(1, 0, -1, 0), b: pt(2, 0, -1, 0) },
  ],
};

// U — staple: a crossbar through the in-dock with two forward prongs (a ⊏).
export const U: ShapePreset = {
  name: "U",
  outDocks: [
    { at: pt(1, 0, 1, 0), dir: E },
    { at: pt(1, 0, -1, 0), dir: E },
  ],
  visual: [
    { a: pt(0, 0, -1, 0), b: pt(0, 0, 1, 0) },
    { a: pt(0, 0, 1, 0), b: pt(1, 0, 1, 0) },
    { a: pt(0, 0, -1, 0), b: pt(1, 0, -1, 0) },
  ],
};

// Stairs — a single-arm zigzag step: forward, up, forward.
export const STAIRS: ShapePreset = {
  name: "Stairs",
  outDocks: [{ at: pt(2, 0, 1, 0), dir: E }],
  visual: [
    { a: O, b: pt(1, 0, 0, 0) },
    { a: pt(1, 0, 0, 0), b: pt(1, 0, 1, 0) },
    { a: pt(1, 0, 1, 0), b: pt(2, 0, 1, 0) },
  ],
};
export const STAIRS_MIRRORED: ShapePreset = mirror(STAIRS, "Stairs Mirrored");

// A straight bar along the NE–SW diagonal axis (the 45° analogue of Straight).
export const DIAGONAL: ShapePreset = {
  name: "Diagonal",
  hidden: true,
  outDocks: [
    { at: pt(0, 1, 0, 0), dir: NE },
    { at: pt(0, -1, 0, 0), dir: SW },
  ],
  visual: [{ a: pt(0, -1, 0, 0), b: pt(0, 1, 0, 0) }],
};

// An eighth-turn: growth arrives East, leaves NE.
export const BEND_45: ShapePreset = {
  name: "45°-Bend",
  hidden: true,
  outDocks: [{ at: pt(0, 2, 0, 0), dir: NE }],
  visual: [{ a: O, b: pt(0, 2, 0, 0) }],
};

// V-toothpick (A161206, inspired-by): two diagonal arms forming a ∨, two tips.
export const VEE: ShapePreset = {
  name: "V",
  hidden: true,
  outDocks: [
    { at: pt(0, 1, 0, 0), dir: NE },
    { at: pt(0, 0, 0, 1), dir: NW },
  ],
  visual: [
    { a: O, b: pt(0, 1, 0, 0) },
    { a: O, b: pt(0, 0, 0, 1) },
  ],
};

// D-toothpick (A194700, inspired-by): a forward orthogonal arm + two diagonal
// arms (the orthogonal/diagonal mix that gives the D its name).
export const DEE: ShapePreset = {
  name: "D",
  hidden: true,
  outDocks: [
    { at: pt(1, 0, 0, 0), dir: E },
    { at: pt(0, 1, 0, 0), dir: NE },
    { at: pt(0, 0, 0, -1), dir: SE },
  ],
  visual: [
    { a: O, b: pt(1, 0, 0, 0) },
    { a: O, b: pt(0, 1, 0, 0) },
    { a: O, b: pt(0, 0, 0, -1) },
  ],
};

// E-toothpick (A161328, inspired-by): a diagonal X — four diagonal arms.
export const EEE: ShapePreset = {
  name: "E",
  hidden: true,
  outDocks: [
    { at: pt(0, 1, 0, 0), dir: NE },
    { at: pt(0, 0, 0, 1), dir: NW },
    { at: pt(0, -1, 0, 0), dir: SW },
    { at: pt(0, 0, 0, -1), dir: SE },
  ],
  visual: [
    { a: O, b: pt(0, 1, 0, 0) },
    { a: O, b: pt(0, 0, 0, 1) },
    { a: O, b: pt(0, -1, 0, 0) },
    { a: O, b: pt(0, 0, 0, -1) },
  ],
};

// A 3-arm upward fan (axis N + two diagonals).
export const FORK: ShapePreset = {
  name: "Fork",
  hidden: true,
  outDocks: [
    { at: pt(0, 0, 1, 0), dir: N },
    { at: pt(0, 1, 0, 0), dir: NE },
    { at: pt(0, 0, 0, 1), dir: NW },
  ],
  visual: [
    { a: O, b: pt(0, 0, 1, 0) },
    { a: O, b: pt(0, 1, 0, 0) },
    { a: O, b: pt(0, 0, 0, 1) },
  ],
};

// A dense star: every direction except the incoming West (fast-capping).
export const ASTERISK: ShapePreset = {
  name: "Asterisk",
  hidden: true,
  outDocks: [
    { at: pt(1, 0, 0, 0), dir: E },
    { at: pt(0, 1, 0, 0), dir: NE },
    { at: pt(0, 0, 1, 0), dir: N },
    { at: pt(0, 0, 0, 1), dir: NW },
    { at: pt(0, -1, 0, 0), dir: SW },
    { at: pt(0, 0, -1, 0), dir: S },
    { at: pt(0, 0, 0, -1), dir: SE },
  ],
  visual: [
    { a: O, b: pt(1, 0, 0, 0) },
    { a: O, b: pt(0, 1, 0, 0) },
    { a: O, b: pt(0, 0, 1, 0) },
    { a: O, b: pt(0, 0, 0, 1) },
    { a: O, b: pt(0, -1, 0, 0) },
    { a: O, b: pt(0, 0, -1, 0) },
    { a: O, b: pt(0, 0, 0, -1) },
  ],
};

export const SHAPE_PRESETS: ShapePreset[] = [
  STRAIGHT,
  TEE,
  BEND,
  BEND_MIRRORED,
  LONG_L,
  LONG_L_MIRRORED,
  CROSS,
  Y,
  U,
  STAIRS,
  STAIRS_MIRRORED,
  DIAGONAL,
  BEND_45,
  VEE,
  DEE,
  EEE,
  FORK,
  ASTERISK,
];

/** Presets offered in the picker dropdown (everything not flagged `hidden`). */
export function visiblePresets(): ShapePreset[] {
  return SHAPE_PRESETS.filter((p) => !p.hidden);
}

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
