import type { Shape, StrategyKind } from "./types";

export interface ShapePicker {
  next(): Shape;
}

function roundRobin(shapes: Shape[]): ShapePicker {
  let i = -1;
  return {
    next() {
      i = (i + 1) % shapes.length;
      return shapes[i];
    },
  };
}

function weighted(shapes: Shape[]): ShapePicker {
  const total = shapes.reduce((sum, s) => sum + Math.max(0, s.weight), 0);
  if (total === 0) return roundRobin(shapes);
  const acc = shapes.map(() => 0);
  return {
    next() {
      let best = 0;
      for (let i = 0; i < shapes.length; i++) {
        acc[i] += Math.max(0, shapes[i].weight);
        if (acc[i] > acc[best]) best = i;
      }
      acc[best] -= total;
      return shapes[best];
    },
  };
}

export function createPicker(kind: StrategyKind, shapes: Shape[]): ShapePicker {
  if (shapes.length === 0) throw new Error("createPicker requires at least one shape");
  return kind === "weighted" ? weighted(shapes) : roundRobin(shapes);
}
