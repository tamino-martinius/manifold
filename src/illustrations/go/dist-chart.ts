import type { Distribution } from "./distribution";

// Theme-independent chart surface + ink so every palette color (incl. black and
// white) reads regardless of the panel theme. Bands are delineated by hairline
// separators; overlapping lines get a surface halo (dataviz mark specs).
const SURFACE = "#31363e"; // mid-dark neutral chart backdrop
const SEPARATOR = "rgba(255, 255, 255, 0.5)";
const GUIDE = "rgba(255, 255, 255, 0.1)";

/**
 * Draws the color distribution as a stacked area ("stacked") or overlaid per-color
 * lines ("lines"), full-width across the turns, with a vertical playhead at
 * `frameFraction` (0..1). `scale` picks the y-axis: "percentage" normalizes each
 * column to its own live-stone total (every slice fills the height — composition);
 * "absolute" normalizes everything to the peak total live-stone count over the run
 * (columns grow with the board — magnitude). Colors are the player colors, in order.
 */
export function createDistChart(canvas: HTMLCanvasElement): {
  draw(
    dist: Distribution,
    colors: string[],
    mode: "stacked" | "lines",
    scale: "percentage" | "absolute",
    frameFraction: number,
    hoverFraction: number | null,
  ): void;
} {
  const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;

  return {
    draw(dist, colors, mode, scale, frameFraction, hoverFraction) {
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
        // cum[i*(C+1)+j] = cumulative raw live count of colors [0, j) at sample i;
        // cum[..C] is that sample's total. Track the peak total for absolute scaling.
        const cum = new Float64Array(n * (C + 1));
        let maxTotal = 0;
        for (let i = 0; i < n; i++) {
          const base = i * (C + 1);
          let acc = 0;
          cum[base] = 0;
          for (let c = 0; c < C; c++) {
            acc += dist.counts[i * C + c];
            cum[base + c + 1] = acc;
          }
          if (acc > maxTotal) maxTotal = acc;
        }
        // Denominator per column: its own total (percentage → full height) or the
        // global peak (absolute → columns scale with the board). Never 0 — when a
        // column total is 0 its numerators are 0 too, so the result is still 0.
        const denomAt = (i: number): number => {
          const d = scale === "absolute" ? maxTotal : cum[i * (C + 1) + C];
          return d > 0 ? d : 1;
        };
        const yTop = (i: number, j: number): number => h - (cum[i * (C + 1) + j] / denomAt(i)) * h;

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
            const value = (i: number): number => {
              const base = i * (C + 1);
              return h - ((cum[base + c + 1] - cum[base + c]) / denomAt(i)) * h;
            };
            const trace = (): void => {
              ctx.beginPath();
              for (let i = 0; i < n; i++) {
                const x = xAt(i);
                const y = value(i);
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

      // Hover crosshair — a soft, thin line marking the pointer's turn (drawn under
      // the bolder playhead so the two never fight when they overlap).
      if (hoverFraction !== null) {
        const hx = Math.round(hoverFraction * w) + 0.5;
        ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(hx, 0);
        ctx.lineTo(hx, h);
        ctx.stroke();
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
