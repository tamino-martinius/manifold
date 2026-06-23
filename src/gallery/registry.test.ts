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

  it("includes the prime-spiral illustration with required fields", () => {
    const spiral = illustrations.find((i) => i.id === "prime-spiral");
    expect(spiral).toBeDefined();
    expect(spiral?.route).toBe("prime-spiral/");
    expect(spiral?.title.length).toBeGreaterThan(0);
    expect(spiral?.description.length).toBeGreaterThan(0);
    expect(typeof spiral?.mountPreview).toBe("function");
  });
});
