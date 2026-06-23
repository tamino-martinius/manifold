import "./footer.css";
import { el } from "./dom";

const GITHUB_URL = "https://github.com/tamino-martinius/manifold";
const LEGAL_URL = "https://www.tamino.dev/#legal";

function footerLink(href: string, text: string): HTMLElement {
  return el(
    "a",
    { className: "m-footer-link", href, target: "_blank", rel: "noopener noreferrer" },
    [text],
  );
}

/** The shared site footer — used on the gallery and every illustration studio. */
export function pageFooter(): HTMLElement {
  return el("footer", { className: "m-footer ds-label" }, [
    el("span", { className: "m-footer-credit" }, [
      "Computed with ",
      el("span", { className: "m-footer-heart", "aria-hidden": "true" }, ["♥"]),
    ]),
    el("span", { className: "m-footer-sep", "aria-hidden": "true" }, ["·"]),
    footerLink(GITHUB_URL, "Open source on GitHub"),
    el("span", { className: "m-footer-sep", "aria-hidden": "true" }, ["·"]),
    footerLink(LEGAL_URL, "Legal"),
  ]);
}
