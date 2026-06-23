// Off-main-thread sieve + coordinate computation. Posts progress, then transfers
// the packed typed arrays so even N = 1,000,000 never freezes the UI.
import { buildSpiralData } from "./compute";

type Request = { n: number; token: number };

const post = (msg: unknown, transfer?: Transferable[]): void =>
  (globalThis as { postMessage(m: unknown, t?: Transferable[]): void }).postMessage(msg, transfer);

globalThis.addEventListener("message", (event) => {
  const { n, token } = (event as MessageEvent<Request>).data;
  const data = buildSpiralData(n, (done) => post({ type: "progress", token, done, total: n }));
  post({ type: "done", token, xs: data.xs, ys: data.ys, isPrime: data.isPrime, n: data.n }, [
    data.xs.buffer,
    data.ys.buffer,
    data.isPrime.buffer,
  ]);
});
