import type { Dir, DockSpec, Segment } from "../types";

const SVGNS = "http://www.w3.org/2000/svg";

/** Canonical-frame bounds, including the in-dock arrow stub at (-1.3, 0). */
export function diagramBounds(
  outDocks: DockSpec[],
  visual: Segment[],
): { minX: number; minY: number; maxX: number; maxY: number } {
  let minX = -1.3;
  let minY = 0;
  let maxX = 0;
  let maxY = 0;
  const ext = (x: number, y: number): void => {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  };
  for (const s of visual) {
    ext(s.x1, s.y1);
    ext(s.x2, s.y2);
  }
  for (const d of outDocks) ext(d.dx, d.dy);
  return { minX, minY, maxX, maxY };
}

function svgEl(tag: string, attrs: Record<string, string | number>): SVGElement {
  const node = document.createElementNS(SVGNS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, String(v));
  return node;
}

function dirVec(dir: Dir): [number, number] {
  switch (dir) {
    case 0:
      return [1, 0];
    case 1:
      return [0, 1];
    case 2:
      return [-1, 0];
    default:
      return [0, -1];
  }
}

/**
 * An SVG diagram of a shape: cosmetic segments in the shape color, the in-dock
 * (dashed stub + dot, muted) and every out-dock (dot + direction stub, accent).
 * Math +y is up, so all y are negated for screen space.
 */
export function dockDiagram(
  outDocks: DockSpec[],
  visual: Segment[],
  color: string,
  px: number,
): SVGSVGElement {
  const b = diagramBounds(outDocks, visual);
  const pad = 0.6;
  const vbX = b.minX - pad;
  const vbY = -(b.maxY + pad);
  const vbW = b.maxX - b.minX + pad * 2;
  const vbH = b.maxY - b.minY + pad * 2;
  const Y = (y: number): number => -y;

  const svg = document.createElementNS(SVGNS, "svg");
  svg.setAttribute("class", "tp-dock-diagram");
  svg.setAttribute("viewBox", `${vbX} ${vbY} ${vbW} ${vbH}`);
  svg.setAttribute("width", String(px));
  svg.setAttribute("height", String(Math.round((px * vbH) / vbW)));

  for (const s of visual) {
    svg.append(
      svgEl("line", {
        x1: s.x1,
        y1: Y(s.y1),
        x2: s.x2,
        y2: Y(s.y2),
        stroke: color,
        "stroke-width": 0.2,
        "stroke-linecap": "round",
      }),
    );
  }

  // In-dock: dashed stub arriving from the west + origin dot.
  svg.append(
    svgEl("line", {
      x1: -1.25,
      y1: Y(0),
      x2: -0.4,
      y2: Y(0),
      stroke: "var(--text-muted)",
      "stroke-width": 0.11,
      "stroke-dasharray": "0.18 0.14",
    }),
  );
  svg.append(svgEl("circle", { cx: 0, cy: Y(0), r: 0.15, fill: "var(--text-muted)" }));

  // Out-docks: dot + short stub in the outgoing direction.
  for (const d of outDocks) {
    const [ux, uy] = dirVec(d.dir);
    svg.append(svgEl("circle", { cx: d.dx, cy: Y(d.dy), r: 0.16, fill: "var(--accent)" }));
    svg.append(
      svgEl("line", {
        x1: d.dx,
        y1: Y(d.dy),
        x2: d.dx + ux * 0.55,
        y2: Y(d.dy + uy * 0.55),
        stroke: "var(--accent)",
        "stroke-width": 0.13,
        "stroke-linecap": "round",
      }),
    );
  }

  return svg;
}
