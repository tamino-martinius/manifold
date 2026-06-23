// Theme controller for the Manifold design system.
// Auto-selects from the OS (prefers-color-scheme) until the user picks one,
// then persists their choice. The first paint is handled by a tiny inline
// script in each HTML <head>; this module keeps things in sync and exposes a
// toggle for the UI.

export type Theme = "dark" | "light";

const STORAGE_KEY = "manifold-theme";
const lightQuery = "(prefers-color-scheme: light)";

function systemTheme(): Theme {
  return window.matchMedia(lightQuery).matches ? "light" : "dark";
}

function storedTheme(): Theme | null {
  const v = localStorage.getItem(STORAGE_KEY);
  return v === "dark" || v === "light" ? v : null;
}

function apply(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
}

export function currentTheme(): Theme {
  const attr = document.documentElement.dataset.theme;
  return attr === "light" ? "light" : attr === "dark" ? "dark" : systemTheme();
}

const listeners = new Set<(t: Theme) => void>();

/** Subscribe to theme changes (e.g. to swap a toggle icon). Returns unsubscribe. */
export function onThemeChange(fn: (t: Theme) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function notify(theme: Theme): void {
  for (const fn of listeners) fn(theme);
}

/** Apply the resolved theme and follow OS changes until the user overrides. */
export function initTheme(): void {
  apply(storedTheme() ?? systemTheme());
  window.matchMedia(lightQuery).addEventListener("change", () => {
    if (!storedTheme()) {
      const t = systemTheme();
      apply(t);
      notify(t);
    }
  });
}

/** Flip the theme, persist the choice, and notify listeners. Returns the new theme. */
export function toggleTheme(): Theme {
  const next: Theme = currentTheme() === "dark" ? "light" : "dark";
  localStorage.setItem(STORAGE_KEY, next);
  apply(next);
  notify(next);
  return next;
}
