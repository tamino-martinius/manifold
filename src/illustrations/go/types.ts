/**
 * Columnar per-move delta stream, packed for zero-copy transfer out of the
 * worker. Move `m` places a stone at (placedX[m], placedY[m]) of color
 * placedColor[m] and removes the captured stones in
 * cap*[capOffset[m] .. capOffset[m + 1]). halfX/halfY[m] are the monotonic
 * max |x| / |y| reached through move m (the auto-fit camera extent).
 */
export type GoData = {
  count: number;
  placedX: Int32Array;
  placedY: Int32Array;
  placedColor: Uint8Array;
  capOffset: Uint32Array; // length count + 1
  capX: Int32Array;
  capY: Int32Array;
  capColor: Uint8Array;
  halfX: Uint16Array;
  halfY: Uint16Array;
  colors: string[]; // colorIdx -> css hex
};
