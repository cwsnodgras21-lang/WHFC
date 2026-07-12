import { describe, expect, it } from "vitest";

import {
  buildTransactionsSearchFilter,
  calculateTotalPages,
  escapeIlikePattern,
  toEndOfDayIso,
  toStartOfDayIso,
} from "@/lib/transactions/query";
import {
  buildTransactionsPageHref,
  hasActiveTransactionFilters,
} from "@/lib/transactions/page-url";
import { parseTransactionsPageFilters } from "@/lib/validation/transactions-page";

describe("transactions page filters", () => {
  it("parses filter search params with defaults", () => {
    const filters = parseTransactionsPageFilters({});

    expect(filters.page).toBe(1);
    expect(filters.itemId).toBe("");
    expect(filters.search).toBe("");
  });

  it("builds search filter for item name and SKU", () => {
    expect(buildTransactionsSearchFilter("glove")).toBe(
      "item_name.ilike.%glove%,internal_sku.ilike.%glove%"
    );
    expect(buildTransactionsSearchFilter("")).toBeNull();
  });

  it("escapes ilike wildcards in search", () => {
    expect(escapeIlikePattern("10%_off")).toBe("10\\%\\_off");
  });

  it("builds page href preserving active filters", () => {
    const filters = parseTransactionsPageFilters({
      itemId: "11111111-1111-4111-8111-111111111111",
      search: "glove",
      page: "2",
    });

    expect(buildTransactionsPageHref(filters, 3)).toBe(
      "/transactions?itemId=11111111-1111-4111-8111-111111111111&search=glove&page=3"
    );
  });

  it("detects active filters", () => {
    expect(hasActiveTransactionFilters(parseTransactionsPageFilters({}))).toBe(
      false
    );
    expect(
      hasActiveTransactionFilters(
        parseTransactionsPageFilters({ transactionType: "RECEIVE" })
      )
    ).toBe(true);
  });

  it("converts date range boundaries to ISO timestamps", () => {
    expect(toStartOfDayIso("2026-07-01")).toBe("2026-07-01T00:00:00.000Z");
    expect(toEndOfDayIso("2026-07-01")).toBe("2026-07-01T23:59:59.999Z");
    expect(toStartOfDayIso("invalid")).toBeNull();
  });

  it("calculates total pages", () => {
    expect(calculateTotalPages(0, 25)).toBe(1);
    expect(calculateTotalPages(26, 25)).toBe(2);
  });
});
