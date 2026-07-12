import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  EXPIRATION_BUCKETS,
  EXPIRATION_BUCKET_LABELS,
} from "@/lib/lots/expiration";
import type { FilterOption } from "@/lib/data/expiration-center-page";
import type { ExpirationCenterPageFilters } from "@/lib/validation/expiration-center-page";

type ExpirationFiltersFormProps = {
  filters: ExpirationCenterPageFilters;
  categories: FilterOption[];
  items: FilterOption[];
  locations: FilterOption[];
};

export function ExpirationFiltersForm({
  filters,
  categories,
  items,
  locations,
}: ExpirationFiltersFormProps) {
  return (
    <form
      method="get"
      action="/expiration"
      className="card card-body space-y-4"
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <label className="field">
          <span className="field-label">Show</span>
          <select name="bucket" defaultValue={filters.bucket} className="field-input">
            {EXPIRATION_BUCKETS.map((bucket) => (
              <option key={bucket} value={bucket}>
                {EXPIRATION_BUCKET_LABELS[bucket]}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span className="field-label">Category</span>
          <select
            name="categoryId"
            defaultValue={filters.categoryId}
            className="field-input"
          >
            <option value="">All categories</option>
            {categories.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span className="field-label">Item</span>
          <select
            name="itemId"
            defaultValue={filters.itemId}
            className="field-input"
          >
            <option value="">All items</option>
            {items.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span className="field-label">Location</span>
          <select
            name="locationId"
            defaultValue={filters.locationId}
            className="field-input"
          >
            <option value="">All locations</option>
            {locations.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit">Apply</Button>
        <Link href="/expiration" className="link-subtle">
          Clear filters
        </Link>
      </div>
    </form>
  );
}
