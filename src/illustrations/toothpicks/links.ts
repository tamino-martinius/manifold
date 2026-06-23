export type ResourceKind = "video" | "oeis";
export type ResourceLink = { kind: ResourceKind; url: string; title: string; label: string };

// Related links for the toothpick illustration (video + OEIS references).
export const TOOTHPICK_LINKS: ResourceLink[] = [
  {
    kind: "video",
    url: "https://www.youtube.com/watch?v=_UtCli1SgjI",
    title: "Toothpicks and the Toothpick Sequence",
    label: "YouTube",
  },
  {
    kind: "oeis",
    url: "https://oeis.org/A139250",
    title: "A139250",
    label: "OEIS · toothpicks",
  },
  {
    kind: "oeis",
    url: "https://oeis.org/A139251",
    title: "A139251",
    label: "OEIS · per stage",
  },
];
