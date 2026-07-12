import { describe, expect, it } from "vitest";
import { readdirSync } from "node:fs";
import { join } from "node:path";

import { canViewTransactions } from "@/lib/auth/permissions";
import type { UserRole } from "@/lib/auth/session";

describe("canViewTransactions", () => {
  const roles: UserRole[] = [
    "administrator",
    "inventory_manager",
    "staff",
    "read_only",
  ];

  it("allows all active roles to view the ledger", () => {
    for (const role of roles) {
      expect(canViewTransactions(true)).toBe(true);
      void role;
    }
  });

  it("denies inactive users", () => {
    expect(canViewTransactions(false)).toBe(false);
  });
});

describe("transactions ledger read-only behavior", () => {
  it("does not expose server actions for ledger mutations", () => {
    const transactionsDir = join(process.cwd(), "src", "app", "(app)", "transactions");
    const files = readdirSync(transactionsDir);

    expect(files).not.toContain("actions.ts");
    expect(files.some((file) => file.endsWith(".action.ts"))).toBe(false);
  });

  it("loads ledger data through select-only query helpers", async () => {
    const queryModule = await import("@/lib/transactions/query");
    const dataModule = await import("@/lib/data/transactions-page");

    expect(typeof queryModule.fetchTransactionHistory).toBe("function");
    expect(typeof dataModule.getTransactionsPageData).toBe("function");
    expect(Object.keys(queryModule)).not.toContain("insertTransaction");
    expect(Object.keys(dataModule)).not.toContain("deleteTransaction");
  });
});
