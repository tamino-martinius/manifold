import { mountChessboardPreview } from "../illustrations/chessboard/preview";

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
      "Pieces fill a number-spiral board, each landing on the lowest cell no enemy attacks.",
    route: "chessboard/",
    mountPreview: mountChessboardPreview,
  },
];
