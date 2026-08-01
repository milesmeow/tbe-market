import { describe, expect, it } from "vitest";

import { listingsHref, parseListingFilter, parseListingSort } from "./listings";

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

describe("parseListingSort", () => {
  it("defaults to newest when the param is absent", () => {
    expect(parseListingSort(undefined)).toBe("newest");
  });

  it("accepts the two real orders", () => {
    expect(parseListingSort("newest")).toBe("newest");
    expect(parseListingSort("oldest")).toBe("oldest");
  });

  it("falls back to newest for anything unrecognised", () => {
    expect(parseListingSort("Oldest")).toBe("newest");
    expect(parseListingSort("price")).toBe("newest");
    expect(parseListingSort("")).toBe("newest");
  });

  it("takes the first value when the param is repeated", () => {
    expect(parseListingSort(["oldest", "newest"])).toBe("oldest");
    expect(parseListingSort([])).toBe("newest");
  });
});

describe("listingsHref", () => {
  it("omits both params for the default view", () => {
    // One canonical URL for the default, rather than /?status=all&sort=newest.
    expect(listingsHref("all", "newest")).toBe("/");
  });

  it("emits only the non-default params", () => {
    expect(listingsHref("available", "newest")).toBe("/?status=available");
    expect(listingsHref("all", "oldest")).toBe("/?sort=oldest");
  });

  it("keeps both when both are non-default", () => {
    // The whole point: neither control may drop the other's choice.
    expect(listingsHref("sold", "oldest")).toBe("/?status=sold&sort=oldest");
  });

  it("round-trips through the parsers", () => {
    const href = listingsHref("sold", "oldest");
    const params = new URLSearchParams(href.split("?")[1]);
    expect(parseListingFilter(params.get("status") ?? undefined)).toBe("sold");
    expect(parseListingSort(params.get("sort") ?? undefined)).toBe("oldest");
  });
});
