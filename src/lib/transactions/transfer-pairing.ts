import type { Database } from "@/lib/types/database";

type TransactionType = Database["public"]["Enums"]["transaction_type"];

export type TransferGroupIndex = Map<
  string,
  { hasIn: boolean; hasOut: boolean }
>;

export type TransferPairableRow = {
  transactionGroupId: string | null;
  transactionType: TransactionType | null;
};

export function indexTransferGroups(
  rows: TransferPairableRow[]
): TransferGroupIndex {
  const map: TransferGroupIndex = new Map();

  for (const row of rows) {
    if (!row.transactionGroupId || !row.transactionType) {
      continue;
    }

    const entry = map.get(row.transactionGroupId) ?? {
      hasIn: false,
      hasOut: false,
    };

    if (row.transactionType === "TRANSFER_IN") {
      entry.hasIn = true;
    }
    if (row.transactionType === "TRANSFER_OUT") {
      entry.hasOut = true;
    }

    map.set(row.transactionGroupId, entry);
  }

  return map;
}

export function isCompleteTransferPair(group: {
  hasIn: boolean;
  hasOut: boolean;
}): boolean {
  return group.hasIn && group.hasOut;
}

export function isTransferTransactionType(
  type: TransactionType | null | undefined
): boolean {
  return type === "TRANSFER_IN" || type === "TRANSFER_OUT";
}

export function formatTransferGroupLabel(
  transactionGroupId: string | null | undefined
): string {
  if (!transactionGroupId) {
    return "—";
  }
  return transactionGroupId.slice(0, 8);
}
