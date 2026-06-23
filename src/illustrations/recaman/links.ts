export type ResourceKind = "video" | "oeis";
export type ResourceLink = { kind: ResourceKind; url: string; title: string; label: string };

// Related links for the Recamán illustration (videos + references).
export const RECAMAN_LINKS: ResourceLink[] = [
  {
    kind: "video",
    url: "https://www.youtube.com/watch?v=FGC5TdIiT9U",
    title: "The Slightly Spooky Recamán Sequence",
    label: "Numberphile",
  },
  {
    kind: "oeis",
    url: "https://oeis.org/A005132",
    title: "A005132",
    label: "OEIS",
  },
];
