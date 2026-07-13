// Stone colors (theme-independent) and the turn-order presets. A "pattern" is a
// repeating list of color hexes — one slot per turn; distinct colors = players.
export const GO_COLORS = {
  black: "#171717",
  white: "#f4efe4",
  red: "#cf2f2a",
  blue: "#2f6fdb",
  green: "#2f9e57",
  amber: "#d98a2b",
} as const;

export const GO_PALETTE: string[] = Object.values(GO_COLORS);

export const DEFAULT_PATTERN: string[] = [GO_COLORS.black, GO_COLORS.white];

export const PATTERN_PRESETS: { name: string; pattern: string[] }[] = [
  { name: "Standard", pattern: [GO_COLORS.black, GO_COLORS.white] },
  { name: "Black-heavy", pattern: [GO_COLORS.black, GO_COLORS.black, GO_COLORS.white] },
  { name: "Three players", pattern: [GO_COLORS.black, GO_COLORS.white, GO_COLORS.red] },
  {
    name: "Four players",
    pattern: [GO_COLORS.black, GO_COLORS.white, GO_COLORS.red, GO_COLORS.green],
  },
];

/** Distinct colors in first-seen order — the players in this pattern. */
export function playerColors(pattern: string[]): string[] {
  const seen: string[] = [];
  for (const c of pattern) if (!seen.includes(c)) seen.push(c);
  return seen;
}
