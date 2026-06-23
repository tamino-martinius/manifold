import type { Dir, DockSpec, Segment, Shape } from "./types";

export type ShapePreset = { name: string; outDocks: DockSpec[]; visual: Segment[] };

const E: Dir = 0;
const N: Dir = 1;
const W: Dir = 2;
const S: Dir = 3;

// All presets are authored in the canonical frame: in-dock at the origin with
// growth arriving from the West (incoming direction East). Logic = outDocks;
// `visual` is cosmetic. STRAIGHT reproduces A139250 exactly and must not change.
export const STRAIGHT: ShapePreset = {
  name: "Straight",
  outDocks: [
    { dx: 0, dy: 1, dir: N },
    { dx: 0, dy: -1, dir: S },
  ],
  visual: [{ x1: 0, y1: -1, x2: 0, y2: 1 }],
};

export const TEE: ShapePreset = {
  name: "T",
  outDocks: [
    { dx: 0, dy: 1, dir: N },
    { dx: 0, dy: -1, dir: S },
    { dx: 1, dy: 0, dir: E },
  ],
  visual: [
    { x1: 0, y1: -1, x2: 0, y2: 1 },
    { x1: 0, y1: 0, x2: 1, y2: 0 },
  ],
};

export const BEND: ShapePreset = {
  name: "Bend",
  outDocks: [{ dx: 1, dy: 1, dir: N }],
  visual: [
    { x1: 0, y1: 0, x2: 1, y2: 0 },
    { x1: 1, y1: 0, x2: 1, y2: 1 },
  ],
};

export const CROSS: ShapePreset = {
  name: "Cross",
  outDocks: [
    { dx: 0, dy: 1, dir: N },
    { dx: 0, dy: -1, dir: S },
    { dx: 1, dy: 0, dir: E },
    { dx: -1, dy: 0, dir: W },
  ],
  visual: [
    { x1: 0, y1: -1, x2: 0, y2: 1 },
    { x1: -1, y1: 0, x2: 1, y2: 0 },
  ],
};

export const SHAPE_PRESETS: ShapePreset[] = [STRAIGHT, TEE, BEND, CROSS];

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
