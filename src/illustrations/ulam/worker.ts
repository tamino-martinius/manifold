// Off-main-thread sieve + highlight build for large N. Posts progress, then
// transfers the packed lit-prime arrays back zero-copy.
import { buildUlamData } from "./compute";
import type { HighlightMode, Quad } from "./sieve";

type Request = { n: number; mode: HighlightMode; quad: Quad; token: number };

const post = (msg: unknown, transfer?: Transferable[]): void =>
  (globalThis as { postMessage(m: unknown, t?: Transferable[]): void }).postMessage(msg, transfer);

globalThis.addEventListener("message", (event) => {
  const { n, mode, quad, token } = (event as MessageEvent<Request>).data;
  const data = buildUlamData(n, mode, quad, (done, total) =>
    post({ type: "progress", token, done, total }),
  );
  post(
    {
      type: "done",
      token,
      xs: data.xs,
      ys: data.ys,
      idx: data.idx,
      colorIndex: data.colorIndex,
      count: data.count,
    },
    [data.xs.buffer, data.ys.buffer, data.idx.buffer, data.colorIndex.buffer],
  );
});
