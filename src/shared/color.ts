export function hexToRgb(hex: string): [number, number, number] {
  let h = hex.replace("#", "");
  if (h.length === 3) {
    h = h
      .split("")
      .map((c) => c + c)
      .join("");
  }
  const n = Number.parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Squared Euclidean distance between two hex colors in RGB space. */
export function colorDistance(a: string, b: string): number {
  const x = hexToRgb(a);
  const y = hexToRgb(b);
  return (x[0] - y[0]) ** 2 + (x[1] - y[1]) ** 2 + (x[2] - y[2]) ** 2;
}

/**
 * Pick the palette color that is most distinct from every existing color
 * (maximizes the minimum distance), so new pieces don't echo an earlier hue.
 */
export function pickDistinctColor(existing: string[], palette: string[]): string {
  let best = palette[0];
  let bestScore = -1;
  for (const c of palette) {
    const score =
      existing.length === 0
        ? Number.POSITIVE_INFINITY
        : Math.min(...existing.map((e) => colorDistance(c, e)));
    if (score > bestScore) {
      bestScore = score;
      best = c;
    }
  }
  return best;
}
