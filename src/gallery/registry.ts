import { mountChessboardPreview } from "../illustrations/chessboard/preview";
import { mountCollatzPreview } from "../illustrations/collatz/preview";
import { mountDragonPreview } from "../illustrations/dragon/preview";
import { mountFordCirclesPreview } from "../illustrations/ford-circles/preview";
import { mountGoldbachPreview } from "../illustrations/goldbach/preview";
import { mountHilbertPreview } from "../illustrations/hilbert/preview";
import { mountLangtonsAntPreview } from "../illustrations/langtons-ant/preview";
import { mountPascalPreview } from "../illustrations/pascal/preview";
import { mountPrimeSpiralPreview } from "../illustrations/prime-spiral/preview";
import { mountRecamanPreview } from "../illustrations/recaman/preview";
import { mountToothpickPreview } from "../illustrations/toothpicks/preview";
import { mountUlamPreview } from "../illustrations/ulam/preview";

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
  {
    id: "goldbach",
    title: "Goldbach's Comet",
    description:
      "Each even number scattered against how many ways it splits into two primes; the dots resolve into a glowing comet whose lower edge never reaches zero.",
    route: "goldbach/",
    mountPreview: mountGoldbachPreview,
  },
  {
    id: "pascal",
    title: "Pascal's Triangle mod n",
    description:
      "Color Pascal's triangle by binomial coefficient mod m — m=2 is the Sierpinski gasket, other moduli give different self-similar lattices.",
    route: "pascal/",
    mountPreview: mountPascalPreview,
  },
  {
    id: "ulam",
    title: "Ulam / Prime Spiral",
    description:
      "The integers spiral out from the center; primes light up and resolve into diagonal streaks traced by prime-rich quadratics like n²+n+41.",
    route: "ulam/",
    mountPreview: mountUlamPreview,
  },
  {
    id: "dragon",
    title: "Dragon Curve",
    description:
      "Fold paper in half k times, unfold every crease to a right angle, and the edge traces a plane-filling fractal that never crosses itself.",
    route: "dragon/",
    mountPreview: mountDragonPreview,
  },
  {
    id: "toothpicks",
    title: "Toothpick Patterns",
    description:
      "Toothpicks sprout at every exposed endpoint, generation by generation, forming A139250's fractal sieve. Pick which shapes grow and in which order each round.",
    route: "toothpicks/",
    mountPreview: mountToothpickPreview,
  },
  {
    id: "ford-circles",
    title: "Ford Circles / Farey",
    description:
      "Every reduced fraction becomes a circle kissing the number line and its Farey neighbors — zoom into an infinite fractal of tangent circles.",
    route: "ford-circles/",
    mountPreview: mountFordCirclesPreview,
  },
  {
    id: "prime-spiral",
    title: "Prime Spiral (Polar)",
    description:
      "Each prime plotted at polar (r=n, θ=n radians); zoom out and the primes organize into ~6, then ~44 Archimedean arms.",
    route: "prime-spiral/",
    mountPreview: mountPrimeSpiralPreview,
  },
  {
    id: "collatz",
    title: "Collatz Coral",
    description:
      "Thousands of 3n+1 trajectories grown from a shared root into an organic branching tree; two turn-angle knobs morph it from tight fern to sprawling coral.",
    route: "collatz/",
    mountPreview: mountCollatzPreview,
  },
  {
    id: "recaman",
    title: "Recamán's Sequence",
    description:
      "Alternating up/down semicircular arcs along a number line trace Recamán's sequence into a non-crossing web.",
    route: "recaman/",
    mountPreview: mountRecamanPreview,
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
