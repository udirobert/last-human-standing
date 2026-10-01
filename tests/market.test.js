// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  validateListing,
  fillListing,
  refundListing,
  expireListing,
  DEFAULT_LISTING_TTL_MS,
  MAX_LISTING_TTL_MS,
} from "../server/lib/market.js";

const A = "0xaaaa";
const B = "0xbbbb";

const ledger = [
  { address: A, amount: 20, reason: "transfer_delivered" },
  { address: B, amount: 20, reason: "transfer_delivered" },
];

const NOW = Date.UTC(2026, 0, 1, 12, 0, 0);
const future = (ms) => new Date(NOW + ms).toISOString();

function listing(over = {}) {
  return {
    id: 1,
    seller: A,
    price: 5,
    status: "open",
    expires_at: future(60_000),
    ...over,
  };
}

describe("validateListing", () => {
  it("accepts a well-formed listing", () => {
    const v = validateListing({
      seller: A, price: 5, itemKind: "location_badge", regionId: "emea",
      now: NOW, ttlMs: 60_000, ledger,
    });
    expect(v.ok).toBe(true);
    expect(v.expiresAt.toISOString()).toBe(future(60_000));
  });

  it("rejects a missing seller, item, or region", () => {
    expect(validateListing({ price: 5, itemKind: "x", regionId: "emea" }).reason).toBe("missing_seller");
    expect(validateListing({ seller: A, price: 5, regionId: "emea" }).reason).toBe("missing_item_kind");
    expect(validateListing({ seller: A, price: 5, itemKind: "x" }).reason).toBe("missing_region");
  });

  it("rejects a non-positive price", () => {
    expect(validateListing({ seller: A, price: 0, itemKind: "x", regionId: "emea" }).reason).toBe("invalid_price");
    expect(validateListing({ seller: A, price: -3, itemKind: "x", regionId: "emea" }).reason).toBe("invalid_price");
  });

  // Listings must expire: urgency is a feature, and speculative accumulation
  // of goods nobody will use is not.
  it("rejects a TTL beyond the hard ceiling", () => {
    const v = validateListing({
      seller: A, price: 5, itemKind: "x", regionId: "emea",
      now: NOW, ttlMs: MAX_LISTING_TTL_MS + 1, ledger,
    });
    expect(v.reason).toBe("ttl_too_long");
  });

  it("rejects a seller who cannot cover the price", () => {
    const v = validateListing({
      seller: "0xcccc", price: 5, itemKind: "x", regionId: "emea",
      now: NOW, ttlMs: 60_000, ledger,
    });
    expect(v.reason).toBe("insufficient_credits");
  });

  it("skips the balance check when no ledger is supplied", () => {
    expect(validateListing({ seller: "0xcccc", price: 5, itemKind: "x", regionId: "emea", now: NOW }).ok).toBe(true);
  });

  it("defaults to a bounded TTL", () => {
    const v = validateListing({ seller: A, price: 5, itemKind: "x", regionId: "emea", now: NOW, ledger });
    expect(v.expiresAt.getTime() - NOW).toBe(DEFAULT_LISTING_TTL_MS);
  });

  it("rejects garbage input", () => {
    expect(validateListing().reason).toBe("missing_seller");
    expect(validateListing({ seller: A, price: 5, itemKind: "x", regionId: "emea", now: "nope" }).reason).toBe("invalid_now");
  });
});

describe("fillListing", () => {
it("moves the buyer's payment to the seller", () => {
      const r = fillListing({ listing: listing(), buyer: B, ledger, now: NOW });
      expect(r.ok).toBe(true);
      expect(r.entries).toHaveLength(2);

      const buyerDebit = r.entries.find((e) => e.address === B && e.reason === "market_spend");
      const sellerCredit = r.entries.find((e) => e.address === A && e.reason === "market_payout");

      expect(buyerDebit.amount).toBe(-5);
      expect(sellerCredit.amount).toBe(5);
      expect(buyerDebit.ref).toBe(sellerCredit.ref);
    });

  // Credits must move, never be created — the sum of a fill's entries is zero.
  it("never mints net credits", () => {
    const r = fillListing({ listing: listing(), buyer: B, ledger, now: NOW });
    expect(r.entries.reduce((sum, e) => sum + e.amount, 0)).toBe(0);
  });

  it("refuses a self-fill", () => {
    expect(fillListing({ listing: listing(), buyer: A, ledger, now: NOW }).reason).toBe("self_fill");
  });

  it("refuses a listing that is not open", () => {
    expect(fillListing({ listing: listing({ status: "filled" }), buyer: B, ledger, now: NOW }).reason).toBe("listing_not_open");
    expect(fillListing({ listing: listing({ status: "expired" }), buyer: B, ledger, now: NOW }).reason).toBe("listing_not_open");
  });

  it("refuses to fill past the expiry", () => {
    const v = fillListing({ listing: listing({ expires_at: future(-1000) }), buyer: B, ledger, now: NOW });
    expect(v.reason).toBe("listing_expired");
  });

  it("refuses a buyer who cannot pay", () => {
    const v = fillListing({ listing: listing({ price: 500 }), buyer: B, ledger, now: NOW });
    expect(v.reason).toBe("insufficient_credits");
  });

  it("refuses when the seller cannot deliver", () => {
    const poorSeller = [{ address: A, amount: 1, reason: "sprint_participation" }, { address: B, amount: 50, reason: "sprint_participation" }];
    expect(fillListing({ listing: listing(), buyer: B, ledger: poorSeller, now: NOW }).reason).toBe("seller_cannot_deliver");
  });

  it("rejects missing arguments", () => {
    expect(fillListing({ buyer: B, ledger, now: NOW }).reason).toBe("missing_listing");
    expect(fillListing({ listing: listing(), ledger, now: NOW }).reason).toBe("missing_buyer");
  });
});

describe("refundListing", () => {
  it("returns the seller's price as a positive entry", () => {
    const [entry] = refundListing({ id: 9, seller: A, price: 7 });
    expect(entry).toMatchObject({ address: "0xaaaa", amount: 7, reason: "market_refund", ref: "9" });
  });

  it("returns nothing for a malformed listing", () => {
    expect(refundListing()).toEqual([]);
    expect(refundListing({ seller: A, price: 0 })).toEqual([]);
  });
});

describe("expireListing", () => {
  const listings = [
    { id: 1, status: "open", seller: A, price: 5, expires_at: future(-1) },
    { id: 2, status: "open", seller: B, price: 5, expires_at: future(60_000) },
    { id: 3, status: "filled", seller: B, price: 5, expires_at: future(-1) },
  ];

  it("returns only open, past-expiry listings", () => {
    const expired = expireListing(listings, NOW);
    expect(expired.map((l) => l.id)).toEqual([1]);
    expect(expired[0].price).toBe(5);
  });

  it("returns an empty array when nothing has expired", () => {
    expect(expireListing([listings[1]], NOW)).toEqual([]);
  });

  it("skips listings with an unparseable expiry", () => {
    expect(expireListing([{ id: 4, status: "open", price: 1, expires_at: "garbage" }], NOW)).toEqual([]);
  });

  it("handles no listings", () => {
    expect(expireListing([], NOW)).toEqual([]);
    expect(expireListing(null, NOW)).toEqual([]);
  });
});