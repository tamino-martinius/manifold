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

  it("includes the dragon illustration with required fields", () => {
    const d = illustrations.find((i) => i.id === "dragon");
    expect(d).toBeDefined();
    expect(d?.route).toBe("dragon/");
    expect(d?.title.length).toBeGreaterThan(0);
    expect(d?.description.length).toBeGreaterThan(0);
    expect(typeof d?.mountPreview).toBe("function");
  });

  it("includes the toothpicks illustration with required fields", () => {
    const tp = illustrations.find((i) => i.id === "toothpicks");
    expect(tp).toBeDefined();
    expect(tp?.route).toBe("toothpicks/");
    expect(tp?.title.length).toBeGreaterThan(0);
    expect(tp?.description.length).toBeGreaterThan(0);
    expect(typeof tp?.mountPreview).toBe("function");
  });

  it("includes the ford-circles illustration with required fields", () => {
    const f = illustrations.find((i) => i.id === "ford-circles");
    expect(f).toBeDefined();
    expect(f?.route).toBe("ford-circles/");
    expect(f?.title.length).toBeGreaterThan(0);
    expect(f?.description.length).toBeGreaterThan(0);
    expect(typeof f?.mountPreview).toBe("function");
  });

  it("includes the prime-spiral illustration with required fields", () => {
    const spiral = illustrations.find((i) => i.id === "prime-spiral");
    expect(spiral).toBeDefined();
    expect(spiral?.route).toBe("prime-spiral/");
    expect(spiral?.title.length).toBeGreaterThan(0);
    expect(spiral?.description.length).toBeGreaterThan(0);
    expect(typeof spiral?.mountPreview).toBe("function");
  });

  it("includes the collatz illustration with required fields", () => {
    const collatz = illustrations.find((i) => i.id === "collatz");
    expect(collatz).toBeDefined();
    expect(collatz?.route).toBe("collatz/");
    expect(collatz?.title.length).toBeGreaterThan(0);
    expect(collatz?.description.length).toBeGreaterThan(0);
    expect(typeof collatz?.mountPreview).toBe("function");
  });

  it("includes the recaman illustration with required fields", () => {
    const r = illustrations.find((i) => i.id === "recaman");
    expect(r).toBeDefined();
    expect(r?.route).toBe("recaman/");
    expect(r?.title.length).toBeGreaterThan(0);
    expect(r?.description.length).toBeGreaterThan(0);
    expect(typeof r?.mountPreview).toBe("function");
  });

  it("includes the langtons-ant illustration with required fields", () => {
    const ant = illustrations.find((i) => i.id === "langtons-ant");
    expect(ant).toBeDefined();
    expect(ant?.route).toBe("langtons-ant/");
    expect(ant?.title.length).toBeGreaterThan(0);
    expect(ant?.description.length).toBeGreaterThan(0);
    expect(typeof ant?.mountPreview).toBe("function");
  });

  it("includes the go illustration with required fields", () => {
    const go = illustrations.find((i) => i.id === "go");
    expect(go).toBeDefined();
    expect(go?.route).toBe("go/");
    expect(go?.title.length).toBeGreaterThan(0);
    expect(go?.description.length).toBeGreaterThan(0);
    expect(typeof go?.mountPreview).toBe("function");
  });

  it("lists the go illustration last", () => {
    expect(illustrations[illustrations.length - 1]?.id).toBe("go");
  });
});
