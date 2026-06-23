import { type Store, createStore } from "../../shared/store";
import { type RecamanArcs, generateRecaman } from "./recaman";

export type ColorMode = "gradient" | "accent";

export type RecamanState = {
  /** Number of steps (arcs); `values` has terms + 1 entries. Structural. */
  terms: number;
  /** Revealed step count along the timeline (fractional while playing). */
  frame: number;
  playing: boolean;
  /** Terms revealed per second while playing. */
  speed: number;
  colorMode: ColorMode;
  /** Alternate up/down by parity; when false every arc is drawn above. */
  alternate: boolean;
  /** Cached packed arc geometry; recomputed when `terms` changes. */
  arcs: RecamanArcs;
};

const INITIAL_TERMS = 200;

export function createRecamanStore(): Store<RecamanState> {
  return createStore<RecamanState>({
    terms: INITIAL_TERMS,
    frame: 0,
    playing: true,
    speed: 60,
    colorMode: "gradient",
    alternate: true,
    arcs: generateRecaman(INITIAL_TERMS),
  });
}
