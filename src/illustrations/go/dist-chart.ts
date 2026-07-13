import type { Distribution } from "./distribution";

// Theme-independent chart surface + ink so every palette color (incl. black and
// white) reads regardless of the panel theme. Bands are delineated by hairline
// separators; overlapping lines get a surface halo (dataviz mark specs).
const SURFACE = "#31363e"; // mid-dark neutral chart backdrop
const SEPARATOR = "rgba(255, 255, 255, 0.5)";
const GUIDE = "rgba(255, 255, 255, 0.1)";

/**
 * Draws the color distribution as a 100%-stacked area ("stacked") or overlaid
 * per-color share lines ("lines"), full-width across the turns, with a vertical
 * playhead at `frameFraction` (0..1). Colors are the player colors, in order.
 */
export function createDistChart(canvas: HTMLCanvasElement): {
  draw(
    dist: Distribution,
    colors: string[],
    mode: "stacked" | "lines",
    frameFraction: number,
  ): void;
} {
  const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;

  return {
    draw(dist, colors, mode, frameFraction) {
      const dpr = window.devicePixelRatio || 1;
      const w = canvas.clientWidth || 240;
      const h = canvas.clientHeight || 120;
      if (canvas.width !== Math.round(w * dpr)) canvas.width = Math.round(w * dpr);
      if (canvas.height !== Math.round(h * dpr)) canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = SURFACE;
      ctx.fillRect(0, 0, w, h);

      const C = dist.colorCount;
      const n = dist.samples;

      // Faint 25/50/75% guide lines.
      ctx.strokeStyle = GUIDE;
      ctx.lineWidth = 1;
      for (const f of [0.25, 0.5, 0.75]) {
        const y = Math.round(h * f) + 0.5;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      if (C > 0 && n > 0) {
        const xAt = (i: number): number => (n <= 1 ? w : (i / (n - 1)) * w);
        // cum[i][j] = cumulative share of colors [0, j) at sample i; cum[i][C] = 1
        // (or 0 for an all-empty row). Precompute once.
        const cum = new Float64Array(n * (C + 1));
        for (let i = 0; i < n; i++) {
          let total = 0;
          for (let c = 0; c < C; c++) total += dist.counts[i * C + c];
          let acc = 0;
          const base = i * (C + 1);
          cum[base] = 0;
          for (let c = 0; c < C; c++) {
            acc += total > 0 ? dist.counts[i * C + c] / total : 0;
            cum[base + c + 1] = acc;
          }
        }
        const yTop = (i: number, j: number): number => h - cum[i * (C + 1) + j] * h;

        if (mode === "stacked") {
          for (let c = 0; c < C; c++) {
            ctx.beginPath();
            for (let i = 0; i < n; i++) {
              const x = xAt(i);
              const y = yTop(i, c + 1);
              if (i === 0) ctx.moveTo(x, y);
              else ctx.lineTo(x, y);
            }
            for (let i = n - 1; i >= 0; i--) ctx.lineTo(xAt(i), yTop(i, c));
            ctx.closePath();
            ctx.fillStyle = colors[c];
            ctx.fill();
          }
          // Hairline separators along each internal band boundary.
          ctx.strokeStyle = SEPARATOR;
          ctx.lineWidth = 1;
          for (let c = 1; c < C; c++) {
            ctx.beginPath();
            for (let i = 0; i < n; i++) {
              const x = xAt(i);
              const y = yTop(i, c);
              if (i === 0) ctx.moveTo(x, y);
              else ctx.lineTo(x, y);
            }
            ctx.stroke();
          }
        } else {
          for (let c = 0; c < C; c++) {
            const share = (i: number): number =>
              h - (cum[i * (C + 1) + c + 1] - cum[i * (C + 1) + c]) * h;
            const trace = (): void => {
              ctx.beginPath();
              for (let i = 0; i < n; i++) {
                const x = xAt(i);
                const y = share(i);
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
              }
            };
            trace(); // surface halo underneath so overlapping/dark lines separate
            ctx.strokeStyle = SURFACE;
            ctx.lineWidth = 4;
            ctx.stroke();
            trace();
            ctx.strokeStyle = colors[c];
            ctx.lineWidth = 2;
            ctx.stroke();
          }
        }
      }

      // Playhead — a light core with a dark halo so it reads over any band.
      const px = Math.round(frameFraction * w) + 0.5;
      ctx.strokeStyle = "rgba(0, 0, 0, 0.55)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(px, 0);
      ctx.lineTo(px, h);
      ctx.stroke();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.95)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(px, 0);
      ctx.lineTo(px, h);
      ctx.stroke();
    },
  };
}
