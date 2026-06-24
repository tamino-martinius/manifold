import { describe, expect, it } from "vitest";
import { groupThousands, parseGrouped } from "./format";

describe("groupThousands", () => {
  it("inserts thousands separators", () => {
    expect(groupThousands(0)).toBe("0");
    expect(groupThousands(50)).toBe("50");
    expect(groupThousands(2500)).toBe("2,500");
    expect(groupThousands(20000)).toBe("20,000");
    expect(groupThousands(200000)).toBe("200,000");
    expect(groupThousands(1234567)).toBe("1,234,567");
  });

  it("preserves sign and fractional part", () => {
    expect(groupThousands(-1500)).toBe("-1,500");
    expect(groupThousands(1234.5)).toBe("1,234.5");
  });

  it("guards non-finite input", () => {
    expect(groupThousands(Number.NaN)).toBe("0");
  });
});

describe("parseGrouped", () => {
  it("strips separators and round-trips", () => {
    expect(parseGrouped("20,000")).toBe(20000);
    for (const n of [0, 100, 2500, 200000]) {
      expect(parseGrouped(groupThousands(n))).toBe(n);
    }
  });
});
