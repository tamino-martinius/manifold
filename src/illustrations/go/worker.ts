// Off-main-thread Go computation: posts progress, then transfers the packed
// delta buffers so large fills never copy or block the UI.
import { computeGoMoves } from "./compute";

type Request = { pattern: string[]; maxMoves: number; token: number };

const post = (msg: unknown, transfer?: Transferable[]): void =>
  (globalThis as { postMessage(m: unknown, t?: Transferable[]): void }).postMessage(msg, transfer);

globalThis.addEventListener("message", (event) => {
  const { pattern, maxMoves, token } = (event as MessageEvent<Request>).data;
  const data = computeGoMoves(pattern, maxMoves, (done) =>
    post({ type: "progress", token, done, total: maxMoves }),
  );
  post({ type: "done", token, data }, [
    data.placedX.buffer,
    data.placedY.buffer,
    data.placedColor.buffer,
    data.capOffset.buffer,
    data.capX.buffer,
    data.capY.buffer,
    data.capColor.buffer,
    data.halfX.buffer,
    data.halfY.buffer,
  ]);
});
