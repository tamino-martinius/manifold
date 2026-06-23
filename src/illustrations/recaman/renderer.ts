import type { Camera } from "./camera";
import type { RecamanArcs } from "./recaman";
import type { ColorMode } from "./state";

// Gradient buckets: arcs are coloured by step index, batched into a small number
// of colour runs so large N still strokes in a handful of paths. Step index is
// monotonic, so consecutive arcs share a bucket — we flush a path whenever the
// bucket changes (no per-frame allocation).
const GRADIENT_BUCKETS = 32;
const ARC_LINE_CSS_PX = 1.5; // device-independent stroke width for the arcs
const LINE_CSS_PX = 1; // the number line
const TICK_CSS_PX = 6; // half-height of the origin tick

function cssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

// Full-rainbow "spectral" ramp via an HSL hue sweep (violet → red), sampled at a
// bucket's centre. Reads as a clear progression along the sequence.
function bucketColor(bucket: number): string {
  const t = (bucket + 0.5) / GRADIENT_BUCKETS;
  const hue = Math.round(270 * (1 - t));
  return `hsl(${hue}, 80%, 58%)`;
}

export function renderRecaman(
  ctx: CanvasRenderingContext2D,
  cam: Camera,
  arcs: RecamanArcs,
  shown: number,
  colorMode: ColorMode,
  alternate: boolean,
  canvasW: number,
  canvasH: number,
): void {
  ctx.clearRect(0, 0, canvasW, canvasH);

  const dpr = window.devicePixelRatio || 1;
  const total = arcs.starts.length;
  const steps = Math.min(Math.max(0, Math.floor(shown)), total);

  const lineColor = cssVar("--line-strong") || "#3a444a";
  const accent = cssVar("--accent") || "#3ddc84";
  const faint = cssVar("--text-faint") || "#5a666d";

  // Right edge of the line = max over the revealed values (the line grows with
  // the reveal). values has steps+1 entries (a(0)..a(steps)).
  let lineMax = arcs.values[0] ?? 0;
  for (let i = 1; i <= steps; i++) {
    const v = arcs.values[i];
    if (v > lineMax) lineMax = v;
  }

  const sy0 = cam.offsetY; // world y=0 in screen space
  const sxOrigin = cam.offsetX; // world x=0 (minValue) in screen space
  const sxMax = lineMax * cam.scale + cam.offsetX;

  // ---- Number line ----
  ctx.lineCap = "butt";
  ctx.lineWidth = Math.max(1, LINE_CSS_PX * dpr);
  ctx.strokeStyle = lineColor;
  ctx.beginPath();
  ctx.moveTo(sxOrigin, sy0);
  ctx.lineTo(sxMax, sy0);
  ctx.stroke();

  // ---- Origin marker + labels ----
  const tick = TICK_CSS_PX * dpr;
  ctx.beginPath();
  ctx.moveTo(sxOrigin, sy0 - tick);
  ctx.lineTo(sxOrigin, sy0 + tick);
  ctx.stroke();

  ctx.fillStyle = faint;
  ctx.font = `${Math.round(11 * dpr)}px ${cssVar("--font-mono") || "ui-monospace, monospace"}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillText("0", sxOrigin, sy0 + tick + 3 * dpr);
  if (lineMax > 0 && steps > 0) {
    ctx.textAlign = "right";
    ctx.fillText(String(lineMax), sxMax, sy0 + tick + 3 * dpr);
  }

  if (steps <= 0) return;

  // ---- Arcs ----
  const { starts, ends, above } = arcs;
  ctx.lineCap = "round";
  ctx.lineWidth = Math.max(1, ARC_LINE_CSS_PX * dpr);

  // Add one semicircle to the current path. Above-the-line arcs bulge toward
  // smaller screen-y (angles π→2π); below-the-line arcs angles 0→π. A moveTo to
  // the arc's start point keeps successive arcs from being joined by chords.
  const addArc = (i: number): void => {
    const sr = (Math.abs(ends[i] - starts[i]) / 2) * cam.scale;
    if (sr < 0.25) return;
    const scx = ((starts[i] + ends[i]) / 2) * cam.scale + cam.offsetX;
    if (scx + sr < 0 || scx - sr > canvasW) return; // horizontal cull
    const up = alternate ? above[i] === 1 : true;
    if (up) {
      if (sy0 - sr > canvasH || sy0 < 0) return; // vertical cull
      ctx.moveTo(scx - sr, sy0);
      ctx.arc(scx, sy0, sr, Math.PI, Math.PI * 2);
    } else {
      if (sy0 > canvasH || sy0 + sr < 0) return;
      ctx.moveTo(scx + sr, sy0);
      ctx.arc(scx, sy0, sr, 0, Math.PI);
    }
  };

  if (colorMode === "accent") {
    ctx.strokeStyle = accent;
    ctx.beginPath();
    for (let i = 0; i < steps; i++) addArc(i);
    ctx.stroke();
    return;
  }

  // Gradient: flush a coloured path each time the (monotonic) bucket changes.
  const denom = Math.max(1, total);
  let bucket = -1;
  ctx.beginPath();
  for (let i = 0; i < steps; i++) {
    const nb = Math.min(GRADIENT_BUCKETS - 1, Math.floor((i / denom) * GRADIENT_BUCKETS));
    if (nb !== bucket) {
      if (bucket >= 0) ctx.stroke();
      bucket = nb;
      ctx.strokeStyle = bucketColor(bucket);
      ctx.beginPath();
    }
    addArc(i);
  }
  ctx.stroke();
}
