import { describe, expect, it } from "vitest";

import {
  formatTransferGroupLabel,
  indexTransferGroups,
  isCompleteTransferPair,
  isTransferTransactionType,
} from "@/lib/transactions/transfer-pairing";

describe("transfer pairing", () => {
  const groupId = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";

  it("indexes transfer in/out rows by transaction group id", () => {
    const index = indexTransferGroups([
      {
        transactionGroupId: groupId,
        transactionType: "TRANSFER_OUT",
      },
      {
        transactionGroupId: groupId,
        transactionType: "TRANSFER_IN",
      },
      {
        transactionGroupId: "other-group",
        transactionType: "RECEIVE",
      },
    ]);

    expect(isCompleteTransferPair(index.get(groupId)!)).toBe(true);
    expect(isCompleteTransferPair(index.get("other-group")!)).toBe(false);
  });

  it("identifies transfer transaction types", () => {
    expect(isTransferTransactionType("TRANSFER_IN")).toBe(true);
    expect(isTransferTransactionType("TRANSFER_OUT")).toBe(true);
    expect(isTransferTransactionType("RECEIVE")).toBe(false);
  });

  it("formats a short transfer group label", () => {
    expect(formatTransferGroupLabel(groupId)).toBe("aaaaaaaa");
    expect(formatTransferGroupLabel(null)).toBe("—");
  });
});
