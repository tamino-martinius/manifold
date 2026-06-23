import "../styles/manifold/styles.css";
import "./gallery.css";
import { el } from "../shared/dom";
import { icon } from "../shared/icons";
import { currentTheme, initTheme, onThemeChange, toggleTheme } from "../shared/theme";
import { type Illustration, illustrations } from "./registry";

function themeToggle(): HTMLElement {
  const btn = el("button", {
    className: "m-icon-btn",
    title: "Toggle theme",
    "aria-label": "Toggle theme",
  });
  const paint = () => {
    btn.replaceChildren(icon(currentTheme() === "dark" ? "sun" : "moon", 16));
  };
  btn.addEventListener("click", () => toggleTheme());
  onThemeChange(paint);
  paint();
  return btn;
}

function header(): HTMLElement {
  const brand = el("div", { className: "m-brand" }, [
    el("span", { className: "m-wordmark" }, ["manifold"]),
    el("span", { className: "m-cursor", "aria-hidden": "true" }),
  ]);
  const nav = el("nav", { className: "m-topnav" }, [
    el("span", { className: "ds-label" }, ["atlas"]),
    themeToggle(),
  ]);
  return el("header", { className: "m-header" }, [brand, nav]);
}

function hero(): HTMLElement {
  return el("section", { className: "m-hero ds-grid-bg" }, [
    el("span", { className: "ds-label m-hero-kicker" }, ["atlas of computed mathematics"]),
    el("h1", { className: "m-hero-title" }, [
      "A gallery of figures",
      el("br"),
      "you can take apart.",
    ]),
    el("p", { className: "ds-prose m-hero-blurb" }, [
      "Each illustration is rendered live on a canvas and explored by adjusting its parameters. Open one to begin.",
    ]),
  ]);
}

function card(illo: Illustration, index: number): HTMLElement {
  const canvas = el("canvas", { className: "m-card-canvas" });
  const num = String(index + 1).padStart(2, "0");
  const figure = el("div", { className: "m-card-figure ds-dot-bg" }, [canvas]);
  const body = el("div", { className: "m-card-body" }, [
    el("div", { className: "m-card-meta" }, [
      el("span", { className: "ds-label" }, [num]),
      el("span", { className: "ds-label m-card-open" }, [
        "open in studio",
        icon("arrow-right", 12),
      ]),
    ]),
    el("h2", { className: "m-card-title" }, [illo.title]),
    el("p", { className: "ds-prose m-card-blurb" }, [illo.description]),
  ]);
  const node = el("a", { className: "m-card", href: illo.route }, [figure, body]);
  // Mount the live preview once the canvas is attached to the DOM.
  requestAnimationFrame(() => illo.mountPreview(canvas));
  return node;
}

function mount(root: HTMLElement): void {
  initTheme();
  const grid = el("div", { className: "m-grid" });
  illustrations.forEach((illo, i) => grid.append(card(illo, i)));

  const main = el("main", { className: "m-main" }, [
    el("div", { className: "m-section-head" }, [
      el("span", { className: "ds-label" }, ["figures"]),
      el("span", { className: "ds-label m-count" }, [`${illustrations.length} total`]),
    ]),
    grid,
  ]);

  root.append(el("div", { className: "m-page" }, [header(), hero(), main]));
}

const root = document.getElementById("gallery");
if (root) mount(root);
