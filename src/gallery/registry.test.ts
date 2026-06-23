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

  it("includes the toothpicks illustration with required fields", () => {
    const tp = illustrations.find((i) => i.id === "toothpicks");
    expect(tp).toBeDefined();
    expect(tp?.route).toBe("toothpicks/");
    expect(tp?.title.length).toBeGreaterThan(0);
    expect(tp?.description.length).toBeGreaterThan(0);
    expect(typeof tp?.mountPreview).toBe("function");
  });
});
