import { mountChessboardPreview } from "../illustrations/chessboard/preview";
import { mountPrimeSpiralPreview } from "../illustrations/prime-spiral/preview";

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
    id: "prime-spiral",
    title: "Prime Spiral (Polar)",
    description:
      "Each prime plotted at polar (r=n, θ=n radians); zoom out and the primes organize into ~6, then ~44 Archimedean arms.",
    route: "prime-spiral/",
    mountPreview: mountPrimeSpiralPreview,
  },
];
