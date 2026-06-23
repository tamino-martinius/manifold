export type ResourceKind = "video" | "oeis";
export type ResourceLink = { kind: ResourceKind; url: string; title: string; label: string };

// Related links for the Hilbert curve illustration (videos + OEIS references).
// Note: the 3Blue1Brown video id is `3s7h2MHQtxc` (NOT `gB9n2gHsHN4`, which is a
// different 3b1b video about fractal dimension). A059252 / A059253 are the
// Hilbert curve x / y coordinate sequences respectively.
export const HILBERT_LINKS: ResourceLink[] = [
  {
    kind: "video",
    url: "https://www.youtube.com/watch?v=3s7h2MHQtxc",
    title: "Hilbert's Curve: Is infinite math useful?",
    label: "3Blue1Brown",
  },
  {
    kind: "video",
    url: "https://www.youtube.com/watch?v=x-DgL49CFlM",
    title: "Space-Filling Curves",
    label: "Numberphile",
  },
  {
    kind: "oeis",
    url: "https://oeis.org/A059252",
    title: "A059252",
    label: "OEIS",
  },
  {
    kind: "oeis",
    url: "https://oeis.org/A059253",
    title: "A059253",
    label: "OEIS",
  },
];
