export type ResourceKind = "video" | "oeis";
export type ResourceLink = { kind: ResourceKind; url: string; title: string; label: string };

// Related links for the Ford circles / Farey illustration (video + references).
export const FORD_LINKS: ResourceLink[] = [
  {
    kind: "video",
    url: "https://www.youtube.com/watch?v=0hlvhQZIOQw",
    title: "Funny Fractions and Ford Circles",
    label: "Numberphile",
  },
  {
    kind: "oeis",
    url: "https://oeis.org/A005728",
    title: "A005728",
    label: "OEIS",
  },
  {
    kind: "oeis",
    url: "https://oeis.org/A002487",
    title: "A002487",
    label: "OEIS",
  },
  {
    kind: "oeis",
    url: "https://oeis.org/A007305",
    title: "A007305",
    label: "OEIS",
  },
  {
    kind: "oeis",
    url: "https://oeis.org/A007306",
    title: "A007306",
    label: "OEIS",
  },
];
