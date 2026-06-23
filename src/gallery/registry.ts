import { mountChessboardPreview } from "../illustrations/chessboard/preview";
import { mountToothpickPreview } from "../illustrations/toothpicks/preview";

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
    id: "toothpicks",
    title: "Toothpick Patterns",
    description:
      "Toothpicks sprout at every exposed endpoint, generation by generation, forming A139250's fractal sieve. Pick which shapes grow and in which order each round.",
    route: "toothpicks/",
    mountPreview: mountToothpickPreview,
  },
];
