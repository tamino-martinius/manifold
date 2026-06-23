import { describe, expect, it } from "vitest";
import { TOOTHPICK_LINKS } from "./links";

describe("TOOTHPICK_LINKS", () => {
  it("includes the requested video and OEIS A139250", () => {
    const video = TOOTHPICK_LINKS.find((l) => l.kind === "video");
    expect(video?.url).toContain("_UtCli1SgjI");
    expect(TOOTHPICK_LINKS.some((l) => l.kind === "oeis" && l.url.includes("A139250"))).toBe(true);
  });
});
