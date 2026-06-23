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

  it("includes the collatz illustration with required fields", () => {
    const collatz = illustrations.find((i) => i.id === "collatz");
    expect(collatz).toBeDefined();
    expect(collatz?.route).toBe("collatz/");
    expect(collatz?.title.length).toBeGreaterThan(0);
    expect(collatz?.description.length).toBeGreaterThan(0);
    expect(typeof collatz?.mountPreview).toBe("function");
  });
});
