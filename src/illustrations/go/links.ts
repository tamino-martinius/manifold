export type ResourceKind = "video" | "oeis";
export type ResourceLink = { kind: ResourceKind; url: string; title: string; label: string };

// Reference links (rendered in a toolbar dropdown labelled "Reference").
export const GO_LINKS: ResourceLink[] = [
  {
    kind: "oeis",
    url: "https://en.wikipedia.org/wiki/Rules_of_go",
    title: "Rules of Go",
    label: "Wikipedia",
  },
  {
    kind: "oeis",
    url: "https://en.wikipedia.org/wiki/Go_(game)",
    title: "Go (game)",
    label: "Wikipedia",
  },
];
