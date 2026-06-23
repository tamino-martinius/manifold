import { describe, expect, it } from "vitest";
import { pointKey, rotateDir, rotatePoint } from "./geometry";

describe("rotatePoint", () => {
  it("is identity for East (0)", () => {
    expect(rotatePoint(2, 1, 0)).toEqual([2, 1]);
  });
  it("rotates +90 CCW for North (1): (x,y) -> (-y,x)", () => {
    expect(rotatePoint(1, 0, 1)).toEqual([0, 1]);
    expect(rotatePoint(0, 1, 1)).toEqual([-1, 0]);
  });
  it("rotates 180 for West (2)", () => {
    expect(rotatePoint(2, 3, 2)).toEqual([-2, -3]);
  });
  it("rotates -90 for South (3): (x,y) -> (y,-x)", () => {
    expect(rotatePoint(1, 0, 3)).toEqual([0, -1]);
  });
});

describe("rotateDir", () => {
  it("composes directions modulo 4", () => {
    expect(rotateDir(1, 1)).toBe(2);
    expect(rotateDir(3, 1)).toBe(0);
    expect(rotateDir(0, 3)).toBe(3);
  });
});

describe("pointKey", () => {
  it("is unique per lattice point and handles negatives", () => {
    expect(pointKey(0, 0)).not.toBe(pointKey(1, 0));
    expect(pointKey(-1, 0)).not.toBe(pointKey(0, -1));
    expect(pointKey(5, -7)).toBe(pointKey(5, -7));
  });
});
