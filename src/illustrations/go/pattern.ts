// Stone colors (theme-independent) and the turn-order presets. A "pattern" is a
// repeating list of color hexes — one slot per turn; distinct colors = players.
export const GO_COLORS = {
  black: "#171717",
  white: "#f4efe4",
  red: "#cf2f2a",
  blue: "#2f6fdb",
  green: "#2f9e57",
  orange: "#e2701e",
} as const;

// Fixed 12-color palette (theme-independent), all legible on the goban brown.
export const GO_PALETTE: string[] = [
  "#171717", // black
  "#f4efe4", // white
  "#cf2f2a", // red
  "#2f6fdb", // blue
  "#2f9e57", // green
  "#e2701e", // orange
  "#7a3fc4", // purple
  "#0f9b8e", // teal
  "#e0509e", // pink
  "#37b6e6", // sky
  "#59657a", // slate
  "#8f2f4f", // wine
];

export const DEFAULT_PATTERN: string[] = [GO_COLORS.black, GO_COLORS.white];

const { black: B, white: W, green: G, red: R, blue: L, orange: O } = GO_COLORS;

export const PATTERN_PRESETS: { name: string; pattern: string[] }[] = [
  // Equal rotation of N players.
  { name: "Standard", pattern: [B, W] },
  { name: "3 players", pattern: [B, W, G] },
  { name: "4 players", pattern: [B, W, G, R] },
  { name: "5 players", pattern: [B, W, G, R, L] },
  { name: "6 players", pattern: [B, W, G, R, L, O] },
  // "Mirror" family: the palindromic B,W,W,B core (each doubles its turn) extended
  // with extra single-turn players.
  { name: "Mirror", pattern: [B, W, W, B] },
  { name: "Mirror 3", pattern: [B, W, W, B, G] },
  { name: "Mirror 4", pattern: [B, W, W, B, G, R] },
  { name: "Mirror 5", pattern: [B, W, W, B, G, R, L] },
  { name: "Mirror 6", pattern: [B, W, W, B, G, R, L, O] },
];

/** Distinct colors in first-seen order — the players in this pattern. */
export function playerColors(pattern: string[]): string[] {
  const seen: string[] = [];
  for (const c of pattern) if (!seen.includes(c)) seen.push(c);
  return seen;
}

/** Color for a newly-appended slot: the first palette color not already used,
 *  or the first palette color if every one is present. */
export function nextAddColor(pattern: string[]): string {
  return GO_PALETTE.find((c) => !pattern.includes(c)) ?? GO_PALETTE[0];
}
