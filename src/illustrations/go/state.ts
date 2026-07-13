import { type Store, createStore } from "../../shared/store";
import { DEFAULT_PATTERN } from "./pattern";
import type { GoData } from "./types";

export type GoState = {
  /** Repeating turn-order pattern — one color hex per turn. Structural. */
  pattern: string[];
  /** Max stones to place (moves). Structural. */
  maxMoves: number;
  frame: number;
  playing: boolean;
  speed: number;
  /** Draw captured-and-empty cells faded (live redraw, never recomputes). */
  showTerritory: boolean;
  data: GoData;
  loading: boolean;
  progress: number;
};

export const EMPTY_GO_DATA: GoData = {
  count: 0,
  placedX: new Int32Array(0),
  placedY: new Int32Array(0),
  placedColor: new Uint8Array(0),
  capOffset: new Uint32Array(1),
  capX: new Int32Array(0),
  capY: new Int32Array(0),
  capColor: new Uint8Array(0),
  halfX: new Uint16Array(0),
  halfY: new Uint16Array(0),
  colors: [],
};

export function createGoStore(): Store<GoState> {
  return createStore<GoState>({
    pattern: [...DEFAULT_PATTERN],
    maxMoves: 150000,
    frame: 0,
    playing: true,
    speed: 30,
    showTerritory: false,
    data: EMPTY_GO_DATA,
    loading: true,
    progress: 0,
  });
}
