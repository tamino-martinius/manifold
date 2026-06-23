export type ResourceKind = "video" | "oeis";
export type ResourceLink = { kind: ResourceKind; url: string; title: string; label: string };

// Related links for the Pascal-mod-m illustration (videos + references).
export const PASCAL_LINKS: ResourceLink[] = [
  {
    kind: "video",
    url: "https://www.youtube.com/watch?v=0iMtlus-afo",
    title: "Pascal's Triangle",
    label: "Numberphile",
  },
  {
    kind: "video",
    url: "https://www.youtube.com/watch?v=kMBj2fp52tA",
    title: "The Plotting of Beautiful Curves (Euler Spirals and Sierpiński Triangles)",
    label: "Numberphile2",
  },
  {
    kind: "oeis",
    url: "https://oeis.org/A047999",
    title: "A047999",
    label: "OEIS",
  },
  {
    kind: "oeis",
    url: "https://oeis.org/A007318",
    title: "A007318",
    label: "OEIS",
  },
];
