// Lattice direction on the octagonal grid, math coords with +y up.
// 0=E, 1=NE, 2=N, 3=NW, 4=W, 5=SW, 6=S, 7=SE (count of 45° CCW turns from East).
export type Dir = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

export type StrategyKind = "round-robin" | "weighted";

// Exact lattice point: p·E + q·NE + r·N + s·NW (E,N are axis units; NE,NW diagonal
// units of length 1). Two points coincide iff all four integers match.
export type Pt = { p: number; q: number; r: number; s: number };

// A docking point: a lattice point + the outgoing direction growth continues in.
// Used for a shape's canonical out-docks and for live (absolute) docks alike.
export type DockSpec = { at: Pt; dir: Dir };

// A cosmetic line segment, both endpoints as exact lattice points.
export type Segment = { a: Pt; b: Pt };

// A configurable toothpick shape. Growth uses only `outDocks`; `visual` is drawn
// but never consulted by the algorithm.
export type Shape = {
  id: string;
  name: string;
  color: string;
  weight: number;
  outDocks: DockSpec[];
  visual: Segment[];
};

// One placed shape instance ("one toothpick"): drawn segments in lattice space.
export type Instance = { generation: number; color: string; segments: Segment[] };

/**
 * Columnar form for rendering + zero-copy worker transfer. Segment endpoints are
 * WORLD (screen) floats — diagonal points aren't integers — so the four coord
 * arrays are Float32Array. `instanceIndex[i]` is the ascending 0-based ordinal of
 * the toothpick the segment belongs to; `colorIndex[i]` indexes `colors`. `count`
 * is the number of instances (= A139250(maxGen) for Straight). `genEnds[g]` is the
 * cumulative instance count through generation g, and
 * `genSegEnds[g]` the cumulative segment count (Step-one-generation + frontier slice).
 */
export type PlacedData = {
  x1: Float32Array;
  y1: Float32Array;
  x2: Float32Array;
  y2: Float32Array;
  colorIndex: Uint8Array;
  instanceIndex: Uint32Array;
  colors: string[];
  count: number;
  segCount: number;
  genEnds: number[];
  genSegEnds: number[];
};
