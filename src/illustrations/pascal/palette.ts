import { hexToRgb } from "../../shared/color";

export type RGB = [number, number, number];

/** Extract the #rrggbb / #rgb stops from a CSS gradient string, in order. */
export function parseHexStops(css: string): RGB[] {
  const matches = css.match(/#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g) ?? [];
  return matches.map((h) => hexToRgb(h));
}

/** Sample a piecewise-linear ramp of RGB stops at t ∈ [0, 1] → an `rgb(...)` string. */
export function sampleRamp(stops: RGB[], t: number): string {
  if (stops.length === 0) return "rgb(127, 127, 127)";
  if (stops.length === 1) return rgbStr(stops[0]);
  const clamped = t < 0 ? 0 : t > 1 ? 1 : t;
  const pos = clamped * (stops.length - 1);
  const i = Math.min(stops.length - 2, Math.floor(pos));
  const f = pos - i;
  const a = stops[i];
  const b = stops[i + 1];
  return rgbStr([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f]);
}

function rgbStr(c: RGB): string {
  return `rgb(${c[0] | 0}, ${c[1] | 0}, ${c[2] | 0})`;
}
