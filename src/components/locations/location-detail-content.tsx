import Link from "next/link";

import { StartCountHereButton } from "@/components/locations/start-count-here-button";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { DataTable, DataTableShell } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { PageHeader } from "@/components/ui/page-header";
import type { LocationDetailData } from "@/lib/data/location-detail";

function formatQuantity(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

function locationPlacement(location: LocationDetailData["location"]): string {
  const parts = [
    location.room,
    location.cabinet,
    location.shelf,
    location.bin,
  ].filter((part): part is string => Boolean(part));
  return parts.join(" · ");
}

export function LocationDetailContent({ data }: { data: LocationDetailData }) {
  const placement = locationPlacement(data.location);

  return (
    <>
      <PageHeader
        eyebrow="Storage location"
        title={data.location.locationName}
        description={
          placement || "Everything currently stocked at this location."
        }
        actions={
          <Link href="/locations" className="link-subtle">
            ← All locations
          </Link>
        }
      />

      {!data.canView ? (
        <EmptyState
          title="Permission denied"
          description={data.permissionMessage ?? "Access denied."}
        />
      ) : (
        <>
          {!data.location.active ? (
            <Alert
              variant="warning"
              message="This location is inactive. Stock shown here is historical."
            />
          ) : null}

          {data.loadError ? (
            <ErrorState
              title="Could not load stock"
              message={data.loadError}
            />
          ) : null}

          <div className="flex flex-wrap items-center gap-2">
            {data.canCount && data.location.active ? (
              <StartCountHereButton
                locationId={data.location.id}
                activeCountId={data.activeCountId}
              />
            ) : null}
            <LinkButton href="/consume" variant="secondary">
              Consume
            </LinkButton>
            <LinkButton href="/receive" variant="secondary">
              Receive
            </LinkButton>
            <LinkButton href="/transfer" variant="secondary">
              Transfer
            </LinkButton>
          </div>

          {data.stock.length === 0 ? (
            <EmptyState
              title="Nothing stocked here yet"
              description="Receive or transfer inventory into this location and it will show up here."
            />
          ) : (
            <DataTableShell>
              <DataTable responsive>
                <thead>
                  <tr>
                    <th>Item</th>
                    <th className="text-right">On hand here</th>
                    <th className="text-right">Clinic total</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.stock.map((row) => (
                    <tr key={row.itemId}>
                      <td data-label="Item">
                        <div className="font-medium">{row.itemName}</div>
                        <div className="text-sm text-[var(--color-text-muted)]">
                          {row.internalSku}
                          {!row.itemActive ? " · inactive item" : ""}
                        </div>
                      </td>
                      <td data-label="On hand here" className="text-right">
                        {formatQuantity(row.quantityHere)}{" "}
                        {row.unitAbbreviation}
                      </td>
                      <td data-label="Clinic total" className="text-right">
                        {formatQuantity(row.totalOnHand)}{" "}
                        {row.unitAbbreviation}
                      </td>
                      <td data-label="Status">
                        {row.isLow ? (
                          <Badge variant="warning">Low — reorder</Badge>
                        ) : (
                          <Badge variant="success">OK</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </DataTable>
            </DataTableShell>
          )}
        </>
      )}
    </>
  );
}
