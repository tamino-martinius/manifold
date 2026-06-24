import { mountChessboardPreview } from "../illustrations/chessboard/preview";
import { mountLangtonsAntPreview } from "../illustrations/langtons-ant/preview";

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
    id: "langtons-ant",
    title: "Langton's Ant",
    description:
      "One ant, two turn rules, an all-white grid — chaos for ~10,000 steps, then an abrupt periodic highway to infinity.",
    route: "langtons-ant/",
    mountPreview: mountLangtonsAntPreview,
  },
];
