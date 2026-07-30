import { describe, expect, it } from "vitest";

import { parseListingFilter } from "./listings";

describe("parseListingFilter", () => {
  it("defaults to all when the param is absent", () => {
    expect(parseListingFilter(undefined)).toBe("all");
  });

  it("accepts the two real filters", () => {
    expect(parseListingFilter("available")).toBe("available");
    expect(parseListingFilter("sold")).toBe("sold");
  });

  it("falls back to all for anything unrecognised", () => {
    // A typo or a stale bookmark should show everything, not an empty grid.
    expect(parseListingFilter("Available")).toBe("all");
    expect(parseListingFilter("active")).toBe("all");
    expect(parseListingFilter("")).toBe("all");
  });

  it("takes the first value when the param is repeated", () => {
    // ?status=sold&status=available arrives as an array.
    expect(parseListingFilter(["sold", "available"])).toBe("sold");
    expect(parseListingFilter([])).toBe("all");
  });
});
