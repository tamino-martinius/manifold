import { type Store, createStore } from "../../shared/store";
import { defaultShapes } from "./presets";
import type { PlacedData, Shape, StrategyKind } from "./types";

export type ToothpickState = {
  shapes: Shape[];
  strategy: StrategyKind;
  maxGen: number;
  frame: number;
  playing: boolean;
  speed: number;
  /** Columnar placement data; `count` is 0 until the first compute finishes. */
  placed: PlacedData;
  /** True while the worker is (re)computing. */
  loading: boolean;
  /** Compute progress, 0..1. */
  progress: number;
};

export const EMPTY_PLACED: PlacedData = {
  x1: new Float32Array(0),
  y1: new Float32Array(0),
  x2: new Float32Array(0),
  y2: new Float32Array(0),
  colorIndex: new Uint8Array(0),
  instanceIndex: new Uint32Array(0),
  colors: [],
  count: 0,
  segCount: 0,
  genEnds: [],
  genSegEnds: [],
};

export function createToothpickStore(): Store<ToothpickState> {
  return createStore<ToothpickState>({
    shapes: defaultShapes(),
    strategy: "round-robin",
    maxGen: 256,
    frame: 0,
    playing: true,
    speed: 30,
    placed: EMPTY_PLACED,
    loading: true,
    progress: 0,
  });
}
