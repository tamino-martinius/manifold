import { mountChessboardPreview } from "../illustrations/chessboard/preview";
import { mountCollatzPreview } from "../illustrations/collatz/preview";

export type Illustration = {
  id: string;
  title: string;
  description: string;
  route: string;
  mountPreview(canvas: HTMLCanvasElement): () => void;
};

export const illustrations: Illustration[] = [
  {
    id: "chessboard",
    title: "Chessboard Patterns",
    description:
      "Pieces drop onto a counter-clockwise number spiral, each taking the lowest-indexed cell no opposing piece attacks.",
    route: "chessboard/",
    mountPreview: mountChessboardPreview,
  },
  {
    id: "collatz",
    title: "Collatz Coral",
    description:
      "Thousands of 3n+1 trajectories grown from a shared root into an organic branching tree; two turn-angle knobs morph it from tight fern to sprawling coral.",
    route: "collatz/",
    mountPreview: mountCollatzPreview,
  },
];
