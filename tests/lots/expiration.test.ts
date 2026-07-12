import { describe, expect, it } from "vitest";

import {
  compareLotsFefo,
  deriveLotStatus,
  expirationBucketMatches,
  sortLotsFefo,
  type FefoLot,
} from "@/lib/lots/expiration";
import {
  summarizeExpirations,
  hasExpirationActivity,
  type ExpirationLot,
} from "@/lib/dashboard/analytics";

describe("expirationBucketMatches", () => {
  it("puts everything in the 'all' bucket", () => {
    expect(expirationBucketMatches(-10, "all")).toBe(true);
    expect(expirationBucketMatches(500, "all")).toBe(true);
    expect(expirationBucketMatches(null, "all")).toBe(true);
  });

  it("excludes lots without an expiration date from dated buckets", () => {
    expect(expirationBucketMatches(null, "expired")).toBe(false);
    expect(expirationBucketMatches(null, "expiring_30")).toBe(false);
    expect(expirationBucketMatches(null, "expiring_90")).toBe(false);
  });

  it("matches only past-dated lots in the expired bucket", () => {
    expect(expirationBucketMatches(-1, "expired")).toBe(true);
    expect(expirationBucketMatches(0, "expired")).toBe(false);
    expect(expirationBucketMatches(5, "expired")).toBe(false);
  });

  it("treats day windows as inclusive and forward-looking", () => {
    expect(expirationBucketMatches(0, "expiring_30")).toBe(true);
    expect(expirationBucketMatches(30, "expiring_30")).toBe(true);
    expect(expirationBucketMatches(31, "expiring_30")).toBe(false);
    expect(expirationBucketMatches(-1, "expiring_30")).toBe(false);
    expect(expirationBucketMatches(90, "expiring_90")).toBe(true);
    expect(expirationBucketMatches(60, "expiring_60")).toBe(true);
    expect(expirationBucketMatches(61, "expiring_60")).toBe(false);
  });
});

describe("compareLotsFefo / sortLotsFefo", () => {
  it("orders earliest expiration first, nulls last", () => {
    const lots: FefoLot[] = [
      { id: "c", expirationDate: null, receivedDate: "2026-01-01" },
      { id: "b", expirationDate: "2026-12-01", receivedDate: "2026-01-01" },
      { id: "a", expirationDate: "2026-06-01", receivedDate: "2026-01-01" },
    ];
    expect(sortLotsFefo(lots).map((l) => l.id)).toEqual(["a", "b", "c"]);
  });

  it("breaks expiration ties by received date then id", () => {
    const lots: FefoLot[] = [
      { id: "z", expirationDate: "2026-06-01", receivedDate: "2026-02-01" },
      { id: "y", expirationDate: "2026-06-01", receivedDate: "2026-01-01" },
      { id: "x", expirationDate: "2026-06-01", receivedDate: "2026-01-01" },
    ];
    expect(sortLotsFefo(lots).map((l) => l.id)).toEqual(["x", "y", "z"]);
  });

  it("is a stable comparator (returns 0 for identical lots)", () => {
    const lot: FefoLot = { id: "a", expirationDate: "2026-06-01", receivedDate: "2026-01-01" };
    expect(compareLotsFefo(lot, { ...lot })).toBe(0);
  });
});

describe("deriveLotStatus", () => {
  const today = "2026-07-06";
  const warn = 90;

  it("is depleted when quantity is zero regardless of date", () => {
    expect(deriveLotStatus(0, "2020-01-01", warn, today)).toBe("depleted");
    expect(deriveLotStatus(0, null, warn, today)).toBe("depleted");
  });

  it("is expired when the date is in the past", () => {
    expect(deriveLotStatus(5, "2026-07-05", warn, today)).toBe("expired");
  });

  it("is expiring_soon inside the warning window", () => {
    expect(deriveLotStatus(5, "2026-08-01", warn, today)).toBe("expiring_soon");
    expect(deriveLotStatus(5, "2026-10-04", warn, today)).toBe("expiring_soon");
  });

  it("is active when far out or undated", () => {
    expect(deriveLotStatus(5, "2027-01-01", warn, today)).toBe("active");
    expect(deriveLotStatus(5, null, warn, today)).toBe("active");
  });
});

describe("summarizeExpirations", () => {
  const lots: ExpirationLot[] = [
    lot("expired-a", -3, 4),
    lot("soon-a", 10, 2),
    lot("soon-b", 25, 9),
    lot("mid", 70, 1),
    lot("far", 200, 5),
    lot("undated", null, 8),
  ];

  it("counts mutually-exclusive buckets by nearest window", () => {
    const summary = summarizeExpirations(lots);
    expect(summary.expired).toBe(1);
    expect(summary.expiring30).toBe(2);
    expect(summary.expiring90).toBe(1);
  });

  it("ranks top expiring by soonest date then quantity, ignoring far/undated", () => {
    const summary = summarizeExpirations(lots, 3);
    expect(summary.topExpiring.map((l) => l.itemName)).toEqual([
      "expired-a",
      "soon-a",
      "soon-b",
    ]);
  });

  it("reports activity only when something is expiring or expired", () => {
    expect(hasExpirationActivity(summarizeExpirations(lots))).toBe(true);
    expect(
      hasExpirationActivity(summarizeExpirations([lot("far", 200, 5)]))
    ).toBe(false);
  });
});

function lot(name: string, days: number | null, qty: number): ExpirationLot {
  return {
    lotId: name,
    itemName: name,
    locationName: "Main",
    quantityOnHand: qty,
    unitAbbreviation: "EA",
    daysUntilExpiration: days,
  };
}
