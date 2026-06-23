export type ResourceKind = "video" | "oeis";
export type ResourceLink = { kind: ResourceKind; url: string; title: string; label: string };

// Related links for the chessboard illustration (videos + references).
export const CHESSBOARD_LINKS: ResourceLink[] = [
  {
    kind: "video",
    url: "https://www.youtube.com/watch?v=UiX4CFIiegM",
    title: "Red & Black Knights (extraordinary result)",
    label: "Numberphile",
  },
  {
    kind: "video",
    url: "https://www.youtube.com/watch?v=VgmDuBCayPw",
    title: "Amazing Chessboard Patterns (extra)",
    label: "Numberphile2",
  },
  {
    kind: "oeis",
    url: "https://oeis.org/A392178",
    title: "A392178",
    label: "OEIS",
  },
];
