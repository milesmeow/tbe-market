import { describe, expect, it } from "vitest";

import { isAuthorizedCronRequest } from "./cron";

const SECRET = "s3cret-token";
const VALID = `Bearer ${SECRET}`;

describe("isAuthorizedCronRequest", () => {
  it("accepts the matching bearer token", () => {
    expect(isAuthorizedCronRequest(VALID, SECRET)).toBe(true);
  });

  it("denies when the secret is not configured", () => {
    // Fails closed: a dropped env var must not silently open the endpoint.
    expect(isAuthorizedCronRequest(VALID, undefined)).toBe(false);
    expect(isAuthorizedCronRequest(VALID, "")).toBe(false);
  });

  it("denies a missing header", () => {
    expect(isAuthorizedCronRequest(null, SECRET)).toBe(false);
    expect(isAuthorizedCronRequest("", SECRET)).toBe(false);
  });

  it("denies the wrong secret, including near-misses", () => {
    expect(isAuthorizedCronRequest("Bearer wrong", SECRET)).toBe(false);
    // Same length as the real thing, so this exercises the compare itself
    // rather than the length guard that precedes it.
    expect(isAuthorizedCronRequest("Bearer s3cret-tokeN", SECRET)).toBe(false);
  });

  it("requires the Bearer scheme and exact formatting", () => {
    expect(isAuthorizedCronRequest(SECRET, SECRET)).toBe(false);
    expect(isAuthorizedCronRequest(`bearer ${SECRET}`, SECRET)).toBe(false);
    expect(isAuthorizedCronRequest(`Bearer  ${SECRET}`, SECRET)).toBe(false);
    expect(isAuthorizedCronRequest(`Basic ${SECRET}`, SECRET)).toBe(false);
  });
});
