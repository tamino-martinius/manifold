export type Coord = { x: number; y: number };
export type GridSize = 3 | 5 | 7 | 9;

export type Piece = {
  id: string;
  color: string;
  gridSize: GridSize;
  offsets: [number, number][];
  weight: number;
};

export type StrategyKind = "round-robin" | "weighted";

export type Placement = {
  frame: number;
  index: number;
  coord: Coord;
  pieceId: string;
  color: string;
};

/**
 * Columnar form of the placement sequence, used for rendering and for
 * zero-copy transfer out of the compute worker. `colorIndex[i]` indexes
 * into `colors` (the distinct piece colors in first-seen order).
 */
export type PlacedData = {
  xs: Int32Array;
  ys: Int32Array;
  colorIndex: Uint8Array;
  colors: string[];
  count: number;
};
