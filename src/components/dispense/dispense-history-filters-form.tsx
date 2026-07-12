import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { FilterOption } from "@/lib/data/transactions-page";
import {
  DISPENSE_SOURCE_LABELS,
  DISPENSE_SOURCE_OPTIONS,
  type DispenseHistoryPageFilters,
} from "@/lib/validation/dispense-history-page";

type DispenseHistoryFiltersFormProps = {
  filters: DispenseHistoryPageFilters;
  kitOptions: FilterOption[];
  locationOptions: FilterOption[];
};

export function DispenseHistoryFiltersForm({
  filters,
  kitOptions,
  locationOptions,
}: DispenseHistoryFiltersFormProps) {
  return (
    <form method="get" action="/dispense/history" className="card card-body space-y-4">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <label className="field">
          <span className="field-label">Search kit</span>
          <input
            type="search"
            name="search"
            defaultValue={filters.search ?? ""}
            placeholder="Kit name"
            className="field-input"
            autoComplete="off"
          />
        </label>

        <label className="field">
          <span className="field-label">Procedure kit</span>
          <select
            name="procedureKitId"
            defaultValue={filters.procedureKitId ?? ""}
            className="field-input"
          >
            <option value="">All kits</option>
            {kitOptions.map((option) => (
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
          <span className="field-label">Source</span>
          <select
            name="source"
            defaultValue={filters.source ?? ""}
            className="field-input"
          >
            <option value="">All sources</option>
            {DISPENSE_SOURCE_OPTIONS.map((source) => (
              <option key={source} value={source}>
                {DISPENSE_SOURCE_LABELS[source]}
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
        <Link href="/dispense/history" className="link-subtle">
          Clear filters
        </Link>
        <Badge variant="info">Operational log — no patient data</Badge>
      </div>
    </form>
  );
}
