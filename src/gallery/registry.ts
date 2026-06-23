import { mountChessboardPreview } from "../illustrations/chessboard/preview";
import { mountHilbertPreview } from "../illustrations/hilbert/preview";

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
    id: "hilbert",
    title: "Hilbert Curve",
    description:
      "A single continuous, non-crossing path that fills a 2^k × 2^k grid while keeping 1-D-close indices 2-D-close — locality made visible by a gradient along the path.",
    route: "hilbert/",
    mountPreview: mountHilbertPreview,
  },
];
