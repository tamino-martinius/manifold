export type ResourceKind = "video" | "oeis";
export type ResourceLink = { kind: ResourceKind; url: string; title: string; label: string };

// Related links for Langton's Ant (videos + references).
export const LANGTON_LINKS: ResourceLink[] = [
  {
    kind: "video",
    url: "https://www.youtube.com/watch?v=NWBToaXK5T0",
    title: "Langton's Ant",
    label: "Numberphile",
  },
  {
    kind: "video",
    url: "https://www.youtube.com/watch?v=xU072T4V12A",
    title: "Langton's Ant (the 104 steps)",
    label: "Numberphile2",
  },
  {
    kind: "video",
    url: "https://www.youtube.com/watch?v=oTssNuDEkSc",
    title: "Langton's Ant (extra footage)",
    label: "Numberphile3",
  },
  {
    kind: "oeis",
    url: "https://oeis.org/A255938",
    title: "A255938",
    label: "OEIS",
  },
];
