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

  it("includes the hilbert illustration with required fields", () => {
    const hilbert = illustrations.find((i) => i.id === "hilbert");
    expect(hilbert).toBeDefined();
    expect(hilbert?.route).toBe("hilbert/");
    expect(hilbert?.title.length).toBeGreaterThan(0);
    expect(hilbert?.description.length).toBeGreaterThan(0);
    expect(typeof hilbert?.mountPreview).toBe("function");
  });

  it("includes the goldbach illustration with required fields", () => {
    const gold = illustrations.find((i) => i.id === "goldbach");
    expect(gold).toBeDefined();
    expect(gold?.route).toBe("goldbach/");
    expect(gold?.title.length).toBeGreaterThan(0);
    expect(gold?.description.length).toBeGreaterThan(0);
    expect(typeof gold?.mountPreview).toBe("function");
  });

  it("includes the pascal illustration with required fields", () => {
    const p = illustrations.find((i) => i.id === "pascal");
    expect(p).toBeDefined();
    expect(p?.route).toBe("pascal/");
    expect(p?.title.length).toBeGreaterThan(0);
    expect(p?.description.length).toBeGreaterThan(0);
    expect(typeof p?.mountPreview).toBe("function");
  });

  it("includes the ulam illustration with required fields", () => {
    const ulam = illustrations.find((i) => i.id === "ulam");
    expect(ulam).toBeDefined();
    expect(ulam?.route).toBe("ulam/");
    expect(ulam?.title.length).toBeGreaterThan(0);
    expect(ulam?.description.length).toBeGreaterThan(0);
    expect(typeof ulam?.mountPreview).toBe("function");
  });
});
