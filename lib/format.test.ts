import { describe, expect, it } from "vitest";

import { formatPrice, parsePriceToCents } from "./format";

describe("parsePriceToCents", () => {
  it("parses whole dollars", () => {
    expect(parsePriceToCents("15")).toBe(1500);
  });

  it("parses decimals and rounds to the nearest cent", () => {
    expect(parsePriceToCents("15.50")).toBe(1550);
    expect(parsePriceToCents("15.555")).toBe(1556);
  });

  it("strips currency symbols and separators", () => {
    expect(parsePriceToCents("$1,200")).toBe(120000);
  });

  it("treats zero as valid (free items)", () => {
    expect(parsePriceToCents("0")).toBe(0);
  });

  it("rejects empty or non-numeric input", () => {
    expect(parsePriceToCents("")).toBeNull();
    expect(parsePriceToCents("abc")).toBeNull();
  });
});

describe("formatPrice", () => {
  it("formats cents as USD", () => {
    expect(formatPrice(1500)).toBe("$15.00");
    expect(formatPrice(120000)).toBe("$1,200.00");
  });

  it("shows zero as Free", () => {
    expect(formatPrice(0)).toBe("Free");
  });
});
