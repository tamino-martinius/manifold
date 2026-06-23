import { mountChessboardPreview } from "../illustrations/chessboard/preview";
import { mountRecamanPreview } from "../illustrations/recaman/preview";

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
    id: "recaman",
    title: "Recamán's Sequence",
    description:
      "Alternating up/down semicircular arcs along a number line trace Recamán's sequence into a non-crossing web.",
    route: "recaman/",
    mountPreview: mountRecamanPreview,
  },
];
