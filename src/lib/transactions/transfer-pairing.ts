import type { Database } from "@/lib/types/database";

type TransactionType = Database["public"]["Enums"]["transaction_type"];

export function isTransferTransactionType(
  type: TransactionType | null | undefined
): boolean {
  return type === "TRANSFER_IN" || type === "TRANSFER_OUT";
}
