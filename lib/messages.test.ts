import { describe, expect, it } from "vitest";

import {
  groupByListing,
  isUnreadFor,
  sortedMessages,
  validateMessageBody,
} from "./messages";
import type { Message, ThreadWithDetails } from "./types";

const BUYER = "buyer-1";
const SELLER = "seller-1";

/** A thread with sane defaults; override only what a test cares about. */
function thread(overrides: Partial<ThreadWithDetails> = {}): ThreadWithDetails {
  return {
    id: "thread-1",
    listing_id: "listing-1",
    buyer_id: BUYER,
    seller_id: SELLER,
    last_sender_id: BUYER,
    created_at: "2026-07-01T10:00:00Z",
    last_message_at: "2026-07-01T10:00:00Z",
    buyer_read_at: null,
    seller_read_at: null,
    listing: {
      id: "listing-1",
      title: "Blue sofa",
      price_cents: 5000,
      status: "active",
    },
    messages: [],
    buyer: null,
    seller: null,
    ...overrides,
  };
}

function message(id: string, createdAt: string): Message {
  return {
    id,
    thread_id: "thread-1",
    sender_id: BUYER,
    body: "hello",
    created_at: createdAt,
  };
}

describe("validateMessageBody", () => {
  it("trims surrounding whitespace", () => {
    expect(validateMessageBody("  still available?  ")).toEqual({
      body: "still available?",
    });
  });

  it("rejects an empty message", () => {
    expect(validateMessageBody("")).toHaveProperty("error");
  });

  it("rejects a message that is only whitespace", () => {
    expect(validateMessageBody("   \n\t ")).toHaveProperty("error");
  });

  it("accepts a message at exactly the limit", () => {
    expect(validateMessageBody("a".repeat(2000))).toEqual({
      body: "a".repeat(2000),
    });
  });

  it("rejects a message over the limit", () => {
    expect(validateMessageBody("a".repeat(2001))).toHaveProperty("error");
  });

  it("measures length after trimming, not before", () => {
    // 2000 characters of content plus padding is still a valid message.
    expect(validateMessageBody(`  ${"a".repeat(2000)}  `)).toEqual({
      body: "a".repeat(2000),
    });
  });
});

describe("isUnreadFor", () => {
  it("is unread for the seller when the buyer wrote and nobody has read it", () => {
    expect(isUnreadFor(thread(), SELLER)).toBe(true);
  });

  it("is not unread for the person who sent the last message", () => {
    expect(isUnreadFor(thread(), BUYER)).toBe(false);
  });

  it("is read once the seller's stamp postdates the message", () => {
    const t = thread({ seller_read_at: "2026-07-01T11:00:00Z" });
    expect(isUnreadFor(t, SELLER)).toBe(false);
  });

  it("is unread again when a newer message arrives after the stamp", () => {
    const t = thread({
      seller_read_at: "2026-07-01T11:00:00Z",
      last_message_at: "2026-07-02T09:00:00Z",
    });
    expect(isUnreadFor(t, SELLER)).toBe(true);
  });

  it("reads the buyer's own stamp when the seller replied", () => {
    const t = thread({
      last_sender_id: SELLER,
      last_message_at: "2026-07-02T09:00:00Z",
      buyer_read_at: "2026-07-01T11:00:00Z",
      seller_read_at: "2026-07-02T10:00:00Z",
    });
    expect(isUnreadFor(t, BUYER)).toBe(true);
    expect(isUnreadFor(t, SELLER)).toBe(false);
  });

  it("is never unread for someone who isn't a party to it", () => {
    expect(isUnreadFor(thread(), "stranger")).toBe(false);
  });
});

describe("groupByListing", () => {
  it("collects threads about the same listing", () => {
    const groups = groupByListing([
      thread({ id: "a", listing_id: "listing-1" }),
      thread({ id: "b", listing_id: "listing-2" }),
      thread({ id: "c", listing_id: "listing-1" }),
    ]);

    expect(groups).toHaveLength(2);
    expect(groups[0].listingId).toBe("listing-1");
    expect(groups[0].threads.map((t) => t.id)).toEqual(["a", "c"]);
    expect(groups[1].threads.map((t) => t.id)).toEqual(["b"]);
  });

  it("preserves the order threads arrive in", () => {
    // The query sorts by recent activity, so the first listing seen stays first.
    const groups = groupByListing([
      thread({ listing_id: "newer" }),
      thread({ listing_id: "older" }),
    ]);
    expect(groups.map((g) => g.listingId)).toEqual(["newer", "older"]);
  });

  it("returns nothing for an empty inbox", () => {
    expect(groupByListing([])).toEqual([]);
  });
});

describe("sortedMessages", () => {
  it("orders messages oldest first", () => {
    const t = thread({
      messages: [
        message("second", "2026-07-02T10:00:00Z"),
        message("first", "2026-07-01T10:00:00Z"),
      ],
    });
    expect(sortedMessages(t).map((m) => m.id)).toEqual(["first", "second"]);
  });

  it("does not mutate the original array", () => {
    const messages = [
      message("second", "2026-07-02T10:00:00Z"),
      message("first", "2026-07-01T10:00:00Z"),
    ];
    sortedMessages(thread({ messages }));
    expect(messages.map((m) => m.id)).toEqual(["second", "first"]);
  });
});
