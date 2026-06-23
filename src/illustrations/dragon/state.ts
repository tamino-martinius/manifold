import { type Store, createStore } from "../../shared/store";

export type AnimateMode = "iteration" | "fold";
export type ColorMode = "position" | "solid";

// Order bounds. Iteration strokes fine up to 18 (2^18 ≈ 262k segments); the fold
// morph regenerates points every frame, so it is capped lower (§9).
export const MIN_ORDER = 1;
export const MAX_ORDER = 18;
export const MORPH_MAX_ORDER = 14;

export type DragonState = {
  /** Configured maximum iteration order k. */
  order: number;
  /** Iteration progress (current k); the Iteration-mode timeline value. */
  frame: number;
  /** Crease angle in degrees, 0..90; the Fold-morph timeline value. */
  foldAngle: number;
  playing: boolean;
  /** Timeline advance per second (unitless; scaled per mode in onTick). */
  speed: number;
  animateMode: AnimateMode;
  colorMode: ColorMode;
  /** Show the four rotated copies tiling the plane. */
  tiling: boolean;
};

export function createDragonStore(): Store<DragonState> {
  return createStore<DragonState>({
    order: 12,
    frame: 1,
    foldAngle: 90,
    playing: true,
    speed: 10,
    animateMode: "iteration",
    colorMode: "position",
    tiling: false,
  });
}
