// Off-main-thread Goldbach pair counting. Keeps the UI responsive for large N;
// posts progress, then transfers the packed columnar result (zero-copy).
import { goldbachCounts } from "./goldbach";

type Request = { n: number; token: number };

const post = (msg: unknown, transfer?: Transferable[]): void =>
  (globalThis as { postMessage(m: unknown, t?: Transferable[]): void }).postMessage(msg, transfer);

globalThis.addEventListener("message", (event) => {
  const { n, token } = (event as MessageEvent<Request>).data;
  const data = goldbachCounts(n, (done, total) => post({ type: "progress", token, done, total }));
  post({ type: "done", token, E: data.E, g: data.g, maxG: data.maxG }, [
    data.E.buffer,
    data.g.buffer,
  ]);
});
