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

  it("includes the goldbach illustration with required fields", () => {
    const gold = illustrations.find((i) => i.id === "goldbach");
    expect(gold).toBeDefined();
    expect(gold?.route).toBe("goldbach/");
    expect(gold?.title.length).toBeGreaterThan(0);
    expect(gold?.description.length).toBeGreaterThan(0);
    expect(typeof gold?.mountPreview).toBe("function");
  });
});
