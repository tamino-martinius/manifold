import { describe, expect, it } from "vitest";
import { TOOTHPICK_LINKS } from "./links";

describe("TOOTHPICK_LINKS", () => {
  it("includes the requested video and OEIS A139250", () => {
    const video = TOOTHPICK_LINKS.find((l) => l.kind === "video");
    expect(video?.url).toContain("_UtCli1SgjI");
    expect(TOOTHPICK_LINKS.some((l) => l.kind === "oeis" && l.url.includes("A139250"))).toBe(true);
  });

  it("links the variant sequences now representable (V/E/D)", () => {
    const oeis = TOOTHPICK_LINKS.filter((l) => l.kind === "oeis").map((l) => l.url);
    expect(oeis.some((u) => u.includes("A161206"))).toBe(true); // V
    expect(oeis.some((u) => u.includes("A161328"))).toBe(true); // E
    expect(oeis.some((u) => u.includes("A194700"))).toBe(true); // D
  });
});
