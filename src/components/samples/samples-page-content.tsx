"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { HelpButton } from "@/components/help/help-button";
import { DataTable, DataTableShell } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { PageHeader } from "@/components/ui/page-header";
import { SummaryStats } from "@/components/ui/summary-stats";
import { formatQuantity } from "@/lib/format/inventory";
import type { SamplesPageData } from "@/lib/data/samples";

type SamplesPageContentProps = {
  data: SamplesPageData;
  canManageProducts: boolean;
};

export function SamplesPageContent({
  data,
  canManageProducts,
}: SamplesPageContentProps) {
  const [search, setSearch] = useState("");

  const rows = useMemo(
    () => data.rows.filter((r) => r.active),
    [data.rows]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.productName.toLowerCase().includes(q) ||
        (r.manufacturerVendor ?? "").toLowerCase().includes(q)
    );
  }, [rows, search]);

  const lowCount = rows.filter(
    (r) => r.quantityOnHand <= r.reorderThreshold
  ).length;
  const zeroCount = rows.filter((r) => r.quantityOnHand <= 0).length;
  const expiringCount = rows.filter((r) => r.hasExpiringLot).length;
  const expiredCount = rows.filter((r) => r.hasExpiredLot).length;

  const actions = (
    <>
      <Link href="/samples/dispense">
        <Button variant="primary">Give sample</Button>
      </Link>
      <Link href="/samples/receive">
        <Button variant="secondary">Receive samples</Button>
      </Link>
      <Link href="/samples/history">
        <Button variant="secondary">History</Button>
      </Link>
      {canManageProducts ? (
        <Link href="/samples/products">
          <Button variant="secondary">Manage products</Button>
        </Link>
      ) : null}
      <HelpButton topic="samples" />
    </>
  );

  if (!data.canView) {
    return (
      <div className="space-y-6">
        <PageHeader title="Samples" description="Medication sample inventory." />
        <ErrorState
          title="Access denied"
          message={data.permissionMessage ?? "You cannot view sample inventory."}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Samples"
        description="Medication sample inventory, receiving, and patient dispensing."
        actions={actions}
      />

      <SummaryStats
        aria-label="Sample inventory highlights"
        stats={[
          {
            label: "Low sample stock",
            value: lowCount,
            hint: "At or below contact threshold",
            tone: lowCount > 0 ? "attention" : "success",
          },
          {
            label: "Out of stock",
            value: zeroCount,
            hint: "Zero quantity on hand",
            tone: zeroCount > 0 ? "attention" : "success",
          },
          {
            label: "Expiring soon",
            value: expiringCount,
            tone: expiringCount > 0 ? "attention" : "success",
          },
          {
            label: "Expired",
            value: expiredCount,
            tone: expiredCount > 0 ? "attention" : "success",
          },
        ]}
      />

      {data.loadError ? (
        <ErrorState
          title="Unable to load sample inventory"
          message={data.loadError}
        />
      ) : rows.length === 0 ? (
        <EmptyState
          title="No active sample products"
          description={
            canManageProducts
              ? "Add a sample product to start tracking inventory."
              : "Sample products will appear here once an administrator adds them."
          }
          action={
            canManageProducts ? (
              <Link href="/samples/products/new">
                <Button variant="primary">Add sample product</Button>
              </Link>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-3">
          <input
            type="search"
            placeholder="Search products or manufacturer…"
            className="form-input max-w-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search sample products"
          />

          <DataTableShell>
            <DataTable responsive>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Manufacturer / vendor</th>
                  <th>On hand</th>
                  <th>Threshold</th>
                  <th>Next expiration</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => {
                  const low = row.quantityOnHand <= row.reorderThreshold;
                  const zero = row.quantityOnHand <= 0;
                  return (
                    <tr key={row.sampleProductId}>
                      <td data-label="Product">
                        <div className="font-medium">{row.productName}</div>
                        <div className="text-xs text-muted">
                          {[row.strength, row.dosageForm].filter(Boolean).join(" · ")}
                        </div>
                      </td>
                      <td data-label="Manufacturer / vendor">
                        {row.manufacturerVendor ?? "—"}
                      </td>
                      <td data-label="On hand">
                        {formatQuantity(row.quantityOnHand)} {row.unitAbbreviation}
                      </td>
                      <td data-label="Threshold">
                        {formatQuantity(row.reorderThreshold)} {row.unitAbbreviation}
                      </td>
                      <td data-label="Next expiration">
                        {row.nextExpirationDate ?? "—"}
                      </td>
                      <td data-label="Status">
                        <div className="flex flex-wrap gap-1">
                          {zero ? (
                            <Badge variant="danger">Out of stock</Badge>
                          ) : low ? (
                            <Badge variant="warning">Low</Badge>
                          ) : (
                            <Badge variant="success">OK</Badge>
                          )}
                          {row.hasExpiredLot ? (
                            <Badge variant="danger">Expired lot</Badge>
                          ) : row.hasExpiringLot ? (
                            <Badge variant="caution">Expiring soon</Badge>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </DataTable>
          </DataTableShell>
        </div>
      )}
    </div>
  );
}
