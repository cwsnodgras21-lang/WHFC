import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatTransactionType } from "@/lib/format/inventory";
import { TRANSACTION_TYPE_OPTIONS } from "@/lib/transactions/constants";
import type { FilterOption } from "@/lib/data/transactions-page";
import type { TransactionsPageFilters } from "@/lib/validation/transactions-page";

type TransactionsFiltersFormProps = {
  filters: TransactionsPageFilters;
  itemOptions: FilterOption[];
  locationOptions: FilterOption[];
};

export function TransactionsFiltersForm({
  filters,
  itemOptions,
  locationOptions,
}: TransactionsFiltersFormProps) {
  return (
    <form method="get" action="/transactions" className="card card-body space-y-4">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <label className="field">
          <span className="field-label">Search item</span>
          <input
            type="search"
            name="search"
            defaultValue={filters.search ?? ""}
            placeholder="Name or SKU"
            className="field-input"
            autoComplete="off"
          />
        </label>

        <label className="field">
          <span className="field-label">Item</span>
          <select
            name="itemId"
            defaultValue={filters.itemId ?? ""}
            className="field-input"
          >
            <option value="">All items</option>
            {itemOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span className="field-label">Location</span>
          <select
            name="locationId"
            defaultValue={filters.locationId ?? ""}
            className="field-input"
          >
            <option value="">All locations</option>
            {locationOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span className="field-label">Transaction type</span>
          <select
            name="transactionType"
            defaultValue={filters.transactionType ?? ""}
            className="field-input"
          >
            <option value="">All types</option>
            {TRANSACTION_TYPE_OPTIONS.map((type) => (
              <option key={type} value={type}>
                {formatTransactionType(type)}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span className="field-label">From date</span>
          <input
            type="date"
            name="dateFrom"
            defaultValue={filters.dateFrom ?? ""}
            className="field-input"
          />
        </label>

        <label className="field">
          <span className="field-label">To date</span>
          <input
            type="date"
            name="dateTo"
            defaultValue={filters.dateTo ?? ""}
            className="field-input"
          />
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit">Apply filters</Button>
        <Link href="/transactions" className="link-subtle">
          Clear filters
        </Link>
        <Badge variant="info">Read-only ledger</Badge>
      </div>
    </form>
  );
}
