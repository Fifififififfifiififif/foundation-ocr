import { describe, expect, it } from "vitest";

import { formatMoneyPl, parseMoneyToNumber } from "./money";

describe("parseMoneyToNumber", () => {
  it("parsuje typowe polskie i mieszane formaty", () => {
    expect(parseMoneyToNumber("1234,56")).toBeCloseTo(1234.56, 5);
    expect(parseMoneyToNumber("1 234,56")).toBeCloseTo(1234.56, 5);
    expect(parseMoneyToNumber("1234.56")).toBeCloseTo(1234.56, 5);
    expect(parseMoneyToNumber("1.234,56")).toBeCloseTo(1234.56, 5);
    expect(parseMoneyToNumber("1234,56 zł")).toBeCloseTo(1234.56, 5);
    expect(parseMoneyToNumber("PLN 1234,56")).toBeCloseTo(1234.56, 5);
    expect(parseMoneyToNumber("zł 1 234,56")).toBeCloseTo(1234.56, 5);
  });
});

describe("formatMoneyPl", () => {
  it("formatuje z odstępami tysięcy i sufiksem zł", () => {
    expect(formatMoneyPl(1234.56)).toContain("234,56");
    expect(formatMoneyPl(1234.56)).toContain("zł");
    expect(formatMoneyPl(245.99)).toContain("245,99");
  });
});
