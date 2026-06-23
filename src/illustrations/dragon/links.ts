export type ResourceKind = "video" | "oeis";
export type ResourceLink = { kind: ResourceKind; url: string; title: string; label: string };

// Related links for the Dragon Curve illustration (videos + references).
export const DRAGON_LINKS: ResourceLink[] = [
  {
    kind: "video",
    url: "https://www.youtube.com/watch?v=wCyC-K_PnRY",
    title: "Dragon Curve",
    label: "Numberphile",
  },
  {
    kind: "video",
    url: "https://www.youtube.com/watch?v=v678Em6qyzk",
    title: "Wrong Turn on the Dragon",
    label: "Numberphile2",
  },
  {
    kind: "oeis",
    url: "https://oeis.org/A014577",
    title: "A014577",
    label: "OEIS",
  },
  {
    kind: "oeis",
    url: "https://oeis.org/A005811",
    title: "A005811",
    label: "OEIS",
  },
];
