// Off-main-thread growth. Keeps the UI responsive for large generation counts;
// posts progress, then transfers the packed result.
import { computeToothpicks, packToothpicks } from "./growth";
import type { Shape, StrategyKind } from "./types";

type Request = { shapes: Shape[]; strategy: StrategyKind; maxGen: number; token: number };

const post = (msg: unknown, transfer?: Transferable[]): void =>
  (globalThis as { postMessage(m: unknown, t?: Transferable[]): void }).postMessage(msg, transfer);

globalThis.addEventListener("message", (event) => {
  const { shapes, strategy, maxGen, token } = (event as MessageEvent<Request>).data;
  const instances = computeToothpicks(shapes, strategy, maxGen, (generation) =>
    post({ type: "progress", token, done: generation, total: maxGen }),
  );
  const packed = packToothpicks(instances);
  post(
    {
      type: "done",
      token,
      x1: packed.x1,
      y1: packed.y1,
      x2: packed.x2,
      y2: packed.y2,
      colorIndex: packed.colorIndex,
      instanceIndex: packed.instanceIndex,
      colors: packed.colors,
      count: packed.count,
      segCount: packed.segCount,
      genEnds: packed.genEnds,
      genSegEnds: packed.genSegEnds,
    },
    [
      packed.x1.buffer,
      packed.y1.buffer,
      packed.x2.buffer,
      packed.y2.buffer,
      packed.colorIndex.buffer,
      packed.instanceIndex.buffer,
    ],
  );
});
