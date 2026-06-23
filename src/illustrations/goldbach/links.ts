export type ResourceKind = "video" | "oeis";
export type ResourceLink = { kind: ResourceKind; url: string; title: string; label: string };

// Related links for Goldbach's comet (videos + OEIS references).
export const GOLDBACH_LINKS: ResourceLink[] = [
  {
    kind: "video",
    url: "https://www.youtube.com/watch?v=MxiTG96QOxw",
    title: "Goldbach Conjecture",
    label: "Numberphile",
  },
  {
    kind: "video",
    url: "https://www.youtube.com/watch?v=7D-YKPMWULA",
    title: "Goldbach Conjecture (extra footage)",
    label: "Numberphile2",
  },
  {
    kind: "video",
    url: "https://www.youtube.com/watch?v=Gojd8mTl3Do",
    title: "Goldbach Conjecture (but with TWIN PRIMES)",
    label: "Numberphile3",
  },
  {
    kind: "oeis",
    url: "https://oeis.org/A045917",
    title: "A045917",
    label: "OEIS",
  },
  {
    kind: "oeis",
    url: "https://oeis.org/A002375",
    title: "A002375",
    label: "OEIS",
  },
];
