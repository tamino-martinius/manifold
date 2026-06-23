import { mountChessboardPreview } from "../illustrations/chessboard/preview";
import { mountGoldbachPreview } from "../illustrations/goldbach/preview";

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
    id: "goldbach",
    title: "Goldbach's Comet",
    description:
      "Each even number scattered against how many ways it splits into two primes; the dots resolve into a glowing comet whose lower edge never reaches zero.",
    route: "goldbach/",
    mountPreview: mountGoldbachPreview,
  },
];
