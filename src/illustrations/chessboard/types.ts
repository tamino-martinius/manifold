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
