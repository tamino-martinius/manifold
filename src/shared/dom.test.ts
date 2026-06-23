// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { clear, el } from "./dom";

describe("el", () => {
  it("creates an element with text, props, and children", () => {
    const child = el("span", { className: "c" }, ["hi"]);
    const node = el("div", { id: "x", className: "box" }, [child]);
    expect(node.tagName).toBe("DIV");
    expect(node.id).toBe("x");
    expect(node.className).toBe("box");
    expect(node.children.length).toBe(1);
    expect(node.textContent).toBe("hi");
  });

  it("clear removes all children", () => {
    const node = el("div", {}, [el("span", {}, ["a"]), el("span", {}, ["b"])]);
    clear(node);
    expect(node.children.length).toBe(0);
  });
});
