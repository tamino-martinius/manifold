import "./gallery.css";
import { el } from "../shared/dom";
import { illustrations } from "./registry";

function mount(root: HTMLElement): void {
  const wrap = el("div", { className: "gal-wrap" });
  wrap.append(el("h1", {}, ["Math Illustrations"]));
  wrap.append(el("p", { className: "sub" }, ["Interactive visual explorations."]));

  const grid = el("div", { className: "gal-grid" });
  for (const illo of illustrations) {
    const canvas = el("canvas");
    const body = el("div", { className: "gal-body" }, [
      el("h2", {}, [illo.title]),
      el("p", {}, [illo.description]),
    ]);
    const card = el("a", { className: "gal-card", href: illo.route }, [canvas, body]);
    grid.append(card);
    // Mount the live preview once the canvas is in the DOM.
    requestAnimationFrame(() => illo.mountPreview(canvas));
  }
  wrap.append(grid);
  root.append(wrap);
}

const root = document.getElementById("gallery");
if (root) mount(root);
