import { el } from "./dom";
import { icon } from "./icons";
import { currentTheme, onThemeChange, toggleTheme } from "./theme";

/** A sun/moon button that toggles the theme and keeps its icon in sync. */
export function themeToggle(className = "m-icon-btn"): HTMLButtonElement {
  const btn = el("button", {
    className,
    type: "button",
    title: "Toggle theme",
    "aria-label": "Toggle theme",
  }) as HTMLButtonElement;
  const paint = () => btn.replaceChildren(icon(currentTheme() === "dark" ? "sun" : "moon", 16));
  btn.addEventListener("click", () => toggleTheme());
  onThemeChange(paint);
  paint();
  return btn;
}
