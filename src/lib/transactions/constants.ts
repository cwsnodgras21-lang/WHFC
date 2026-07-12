import type { Database } from "@/lib/types/database";

export type TransactionType = Database["public"]["Enums"]["transaction_type"];

export const TRANSACTION_TYPE_OPTIONS = [
  "RECEIVE",
  "CONSUME",
  "TRANSFER_IN",
  "TRANSFER_OUT",
  "ADJUSTMENT_INCREASE",
  "ADJUSTMENT_DECREASE",
  "PHYSICAL_COUNT_CORRECTION",
] as const satisfies readonly TransactionType[];

export const TRANSACTIONS_PAGE_SIZE = 25;
