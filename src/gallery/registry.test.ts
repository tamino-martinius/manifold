import { describe, expect, it } from "vitest";
import { illustrations } from "./registry";

describe("registry", () => {
  it("includes the chessboard illustration with required fields", () => {
    const chess = illustrations.find((i) => i.id === "chessboard");
    expect(chess).toBeDefined();
    expect(chess?.route).toBe("chessboard/");
    expect(chess?.title.length).toBeGreaterThan(0);
    expect(chess?.description.length).toBeGreaterThan(0);
    expect(typeof chess?.mountPreview).toBe("function");
  });

  it("includes the langtons-ant illustration with required fields", () => {
    const ant = illustrations.find((i) => i.id === "langtons-ant");
    expect(ant).toBeDefined();
    expect(ant?.route).toBe("langtons-ant/");
    expect(ant?.title.length).toBeGreaterThan(0);
    expect(ant?.description.length).toBeGreaterThan(0);
    expect(typeof ant?.mountPreview).toBe("function");
  });
});
