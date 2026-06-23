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

  it("includes the recaman illustration with required fields", () => {
    const r = illustrations.find((i) => i.id === "recaman");
    expect(r).toBeDefined();
    expect(r?.route).toBe("recaman/");
    expect(r?.title.length).toBeGreaterThan(0);
    expect(r?.description.length).toBeGreaterThan(0);
    expect(typeof r?.mountPreview).toBe("function");
  });
});
