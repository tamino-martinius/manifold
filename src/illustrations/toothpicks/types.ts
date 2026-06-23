// Logical direction on the lattice, math coords with +y up: 0=E, 1=N, 2=W, 3=S.
export type Dir = 0 | 1 | 2 | 3;

export type StrategyKind = "round-robin" | "weighted";

// An exposed docking point in world space: lattice point + outgoing direction.
export type Dock = { x: number; y: number; dir: Dir };

// A docking point a shape emits, relative to its canonical frame.
export type DockSpec = { dx: number; dy: number; dir: Dir };

// A cosmetic line segment in the shape's canonical frame (lattice units).
export type Segment = { x1: number; y1: number; x2: number; y2: number };

// A configurable toothpick shape — the analog of a chessboard piece. Growth uses
// only `outDocks`; `visual` is drawn but never consulted by the algorithm.
export type Shape = {
  id: string;
  name: string;
  color: string;
  weight: number;
  outDocks: DockSpec[];
  visual: Segment[];
};

// One placed shape instance ("one toothpick"): its drawn segments in world coords.
export type Instance = { generation: number; color: string; segments: Segment[] };

/**
 * Columnar form for rendering + zero-copy worker transfer. One entry per drawn
 * segment; `instanceIndex[i]` is the 0-based ordinal (ascending) of the toothpick
 * the segment belongs to, `colorIndex[i]` indexes `colors`. `count` is the number
 * of instances (toothpicks) and equals A139250(maxGen) for the Straight preset.
 * `genEnds[g]` is the cumulative instance count through generation g (for the
 * Step-one-generation button).
 */
export type PlacedData = {
  x1: Int32Array;
  y1: Int32Array;
  x2: Int32Array;
  y2: Int32Array;
  colorIndex: Uint8Array;
  instanceIndex: Uint32Array;
  colors: string[];
  count: number;
  segCount: number;
  genEnds: number[];
};
