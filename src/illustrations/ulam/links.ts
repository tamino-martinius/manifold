export type ResourceKind = "video" | "oeis";
export type ResourceLink = { kind: ResourceKind; url: string; title: string; label: string };

// Related links for the Ulam / prime spiral illustration (videos + OEIS references).
export const ULAM_LINKS: ResourceLink[] = [
  {
    kind: "video",
    url: "https://www.youtube.com/watch?v=iFuR97YcSLM",
    title: "Prime Spirals",
    label: "Numberphile",
  },
  {
    kind: "video",
    url: "https://www.youtube.com/watch?v=3K-12i0jclM",
    title: "41 and more Ulam's Spiral",
    label: "Numberphile2",
  },
  {
    kind: "oeis",
    url: "https://oeis.org/A000040",
    title: "A000040",
    label: "OEIS",
  },
  {
    kind: "oeis",
    url: "https://oeis.org/A005846",
    title: "A005846",
    label: "OEIS",
  },
  {
    kind: "oeis",
    url: "https://oeis.org/A214664",
    title: "A214664",
    label: "OEIS",
  },
  {
    kind: "oeis",
    url: "https://oeis.org/A214665",
    title: "A214665",
    label: "OEIS",
  },
];
