export type ResourceKind = "video" | "oeis";
export type ResourceLink = { kind: ResourceKind; url: string; title: string; label: string };

// Related links for the Collatz illustration. Only verified links — note the
// popular "Simplest Math Problem No One Can Solve" video is Veritasium's (NOT
// 3Blue1Brown); the single verified video here is the Numberphile one.
export const COLLATZ_LINKS: ResourceLink[] = [
  {
    kind: "video",
    url: "https://www.youtube.com/watch?v=5mFpVDpKX70",
    title: "UNCRACKABLE? The Collatz Conjecture",
    label: "Numberphile",
  },
  {
    kind: "oeis",
    url: "https://oeis.org/A006577",
    title: "A006577",
    label: "OEIS",
  },
];
