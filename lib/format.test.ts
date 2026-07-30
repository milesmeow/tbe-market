import { describe, expect, it } from "vitest";

import {
  formatPrice,
  formatRelativeTime,
  parsePriceToCents,
} from "./format";

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

describe("formatRelativeTime", () => {
  const now = new Date("2026-07-30T12:00:00Z");

  it("calls the last minute 'just now'", () => {
    expect(formatRelativeTime("2026-07-30T11:59:30Z", now)).toBe("just now");
  });

  it("counts minutes, hours and days", () => {
    expect(formatRelativeTime("2026-07-30T11:30:00Z", now)).toBe(
      "30 minutes ago",
    );
    expect(formatRelativeTime("2026-07-30T09:00:00Z", now)).toBe("3 hours ago");
    expect(formatRelativeTime("2026-07-28T12:00:00Z", now)).toBe("2 days ago");
  });

  it("says yesterday rather than '1 day ago'", () => {
    expect(formatRelativeTime("2026-07-29T12:00:00Z", now)).toBe("yesterday");
  });

  it("switches to weeks after seven days", () => {
    expect(formatRelativeTime("2026-07-16T12:00:00Z", now)).toBe("2 weeks ago");
  });

  it("falls back to a date once it's over a month old", () => {
    // "9 weeks ago" is harder to place than a date.
    expect(formatRelativeTime("2026-05-20T12:00:00Z", now)).toBe("May 20");
  });

  it("includes the year for a different year", () => {
    expect(formatRelativeTime("2025-11-02T12:00:00Z", now)).toBe("Nov 2, 2025");
  });

  it("returns an empty string for an unparseable timestamp", () => {
    expect(formatRelativeTime("not a date", now)).toBe("");
  });
});
