import { mountChessboardPreview } from "../illustrations/chessboard/preview";
import { mountFordCirclesPreview } from "../illustrations/ford-circles/preview";

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
    id: "ford-circles",
    title: "Ford Circles / Farey",
    description:
      "Every reduced fraction becomes a circle kissing the number line and its Farey neighbors — zoom into an infinite fractal of tangent circles.",
    route: "ford-circles/",
    mountPreview: mountFordCirclesPreview,
  },
];
