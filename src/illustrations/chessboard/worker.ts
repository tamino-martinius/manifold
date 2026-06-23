// Off-main-thread placement computation. Keeps the UI responsive for very
// large piece counts; posts progress, then transfers the packed result.
import { computePlacements, packPlacements } from "./placement";
import type { Piece, StrategyKind } from "./types";

type Request = { pieces: Piece[]; strategy: StrategyKind; maxPieces: number; token: number };

const post = (msg: unknown, transfer?: Transferable[]): void =>
  (globalThis as { postMessage(m: unknown, t?: Transferable[]): void }).postMessage(msg, transfer);

globalThis.addEventListener("message", (event) => {
  const { pieces, strategy, maxPieces, token } = (event as MessageEvent<Request>).data;
  const placements = computePlacements(pieces, strategy, maxPieces, (done) =>
    post({ type: "progress", token, done, total: maxPieces }),
  );
  const packed = packPlacements(placements);
  post(
    {
      type: "done",
      token,
      xs: packed.xs,
      ys: packed.ys,
      colorIndex: packed.colorIndex,
      colors: packed.colors,
      count: packed.count,
    },
    [packed.xs.buffer, packed.ys.buffer, packed.colorIndex.buffer],
  );
});
