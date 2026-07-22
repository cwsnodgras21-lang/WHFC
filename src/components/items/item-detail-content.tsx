import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { DataTable, DataTableShell } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { PageSection } from "@/components/ui/page-section";
import { formatQuantity } from "@/lib/format/inventory";
import type { ItemDetailData } from "@/lib/data/item-detail";

function detail(label: string, value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div className="flex flex-col">
      <dt className="text-xs uppercase tracking-wide text-[var(--color-fg-muted)]">
        {label}
      </dt>
      <dd className="text-sm text-[var(--color-fg)]">{value}</dd>
    </div>
  );
}

export function ItemDetailContent({ data }: { data: ItemDetailData }) {
  return (
    <div className="space-y-6">
      <section className="panel">
        <div className="panel-header">
          <h2 className="section-heading">Item details</h2>
          <div className="flex items-center gap-2">
            <Badge variant={data.active ? "success" : "default"}>
              {data.active ? "Active" : "Inactive"}
            </Badge>
            <Link
              href={`/items/${data.itemId}/sourcing`}
              className="link-subtle text-sm font-medium"
            >
              Sourcing →
            </Link>
          </div>
        </div>
        <div className="p-4">
          <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {detail("Category", data.categoryName)}
            {detail(
              "Stocking unit",
              data.unitName ? `${data.unitName} (${data.unitAbbreviation})` : null
            )}
            {detail("Preferred vendor", data.vendorName)}
            {detail("Reorder point", formatQuantity(data.reorderPoint))}
            {detail("Par level", formatQuantity(data.parLevel))}
            {detail(
              "Pack quantity",
              data.packQuantity ? `${data.packQuantity} per ${data.unitAbbreviation}` : null
            )}
            {detail("Total on hand", formatQuantity(data.totalOnHand))}
          </dl>
        </div>
      </section>

      <PageSection
        title="On hand by location"
        action={
          <span className="text-sm text-[var(--color-fg-muted)]">
            {formatQuantity(data.totalOnHand)} {data.unitAbbreviation} total
          </span>
        }
      >
        {data.locationStock.length === 0 ? (
          <EmptyState
            title="No stock on hand"
            description="This item isn't currently stocked at any location."
          />
        ) : (
          <DataTableShell>
            <DataTable>
              <thead>
                <tr>
                  <th scope="col">Location</th>
                  <th scope="col" className="text-right">
                    On hand
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.locationStock.map((row) => (
                  <tr key={row.locationId}>
                    <td>{row.locationName}</td>
                    <td className="numeric">
                      {formatQuantity(row.quantityOnHand)}{" "}
                      <span className="text-[var(--color-fg-muted)] text-xs">
                        {data.unitAbbreviation}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
          </DataTableShell>
        )}
      </PageSection>
    </div>
  );
}
