import { describe, expect, it } from "vitest";

import { isTransferTransactionType } from "@/lib/transactions/transfer-pairing";

describe("transfer pairing", () => {
  it("identifies transfer transaction types", () => {
    expect(isTransferTransactionType("TRANSFER_IN")).toBe(true);
    expect(isTransferTransactionType("TRANSFER_OUT")).toBe(true);
    expect(isTransferTransactionType("RECEIVE")).toBe(false);
  });
});
