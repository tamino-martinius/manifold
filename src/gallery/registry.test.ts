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

  it("includes the ford-circles illustration with required fields", () => {
    const f = illustrations.find((i) => i.id === "ford-circles");
    expect(f).toBeDefined();
    expect(f?.route).toBe("ford-circles/");
    expect(f?.title.length).toBeGreaterThan(0);
    expect(f?.description.length).toBeGreaterThan(0);
    expect(typeof f?.mountPreview).toBe("function");
  });
});
