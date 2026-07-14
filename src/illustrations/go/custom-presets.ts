// User-saved turn-order presets, persisted in localStorage. Each preset is a
// pattern (array of color hexes), same shape as the built-in PATTERN_PRESETS.

const STORAGE_KEY = "go-custom-presets";
const HEX = /^#[0-9a-fA-F]{6}$/;

/**
 * Parse/sanitize raw localStorage JSON into a list of patterns. Anything that
 * isn't an array of non-empty arrays of `#rrggbb` strings is dropped — the store
 * is user-editable and may be stale or corrupt, so never trust its shape.
 */
export function parseCustomPresets(raw: string | null): string[][] {
  if (!raw) return [];
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(data)) return [];
  const out: string[][] = [];
  for (const p of data) {
    if (Array.isArray(p) && p.length > 0 && p.every((c) => typeof c === "string" && HEX.test(c))) {
      out.push(p as string[]);
    }
  }
  return out;
}

/** Load the saved custom presets (empty if none / unavailable). */
export function loadCustomPresets(): string[][] {
  try {
    return parseCustomPresets(localStorage.getItem(STORAGE_KEY));
  } catch {
    return [];
  }
}

/** Persist the custom presets (best-effort; ignores storage failures). */
export function saveCustomPresets(presets: string[][]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
  } catch {
    // storage unavailable / full — custom presets simply won't persist
  }
}
