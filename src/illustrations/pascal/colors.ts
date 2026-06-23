import { currentTheme } from "../../shared/theme";
import { type RGB, parseHexStops } from "./palette";
import type { PascalColors } from "./renderer";

// On the light theme the background is near-white, so bright ramp stops (the
// spectral yellow / light cyan / near-white ends) wash out and the white cell
// numbers lose contrast. Cap each stop's luminance there so cells stay clearly
// darker than the background; the dark theme keeps the vibrant stops as-is
// (saturated colors already contrast well against near-black).
const MAX_LUMA_LIGHT = 0.6;

function luma([r, g, b]: RGB): number {
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255; // 0..1, linear approx
}

// Scale all channels by the same factor → identical hue, lower luminance.
function darkenForLightBg(c: RGB): RGB {
  const L = luma(c);
  if (L <= MAX_LUMA_LIGHT) return c;
  const k = MAX_LUMA_LIGHT / L;
  return [c[0] * k, c[1] * k, c[2] * k];
}

function ramp(css: string, light: boolean): RGB[] {
  const stops = parseHexStops(css);
  return light ? stops.map(darkenForLightBg) : stops;
}

// Read theme-driven colors from the CSS tokens. The accent flips per theme; the
// --pal-* ramps are theme-agnostic in CSS but get darkened on the light theme
// for contrast. Cell numbers are white (with a dark halo) for legibility on any
// cell color. Re-read on theme change.
export function readThemeColors(): PascalColors {
  const cs = getComputedStyle(document.documentElement);
  const light = currentTheme() === "light";
  const pal = (name: string): RGB[] => ramp(cs.getPropertyValue(name), light);
  return {
    lit: cs.getPropertyValue("--accent").trim() || "#3ddc84",
    number: "#ffffff",
    ramps: {
      spectral: pal("--pal-spectral"),
      prime: pal("--pal-ice"),
      nonPrime: pal("--pal-ember"),
      perfect: pal("--pal-phosphor"),
      nonPerfect: pal("--pal-mono"),
    },
  };
}
