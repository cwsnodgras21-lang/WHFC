"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  removeItemVendorAction,
  setPreferredItemVendorAction,
} from "@/lib/actions/item-vendors";
import { ItemVendorFormDialog } from "@/components/item-vendors/item-vendor-form-dialog";
import type {
  ItemSourcingData,
  ItemVendorSource,
} from "@/lib/data/item-sourcing";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageSection } from "@/components/ui/page-section";
import { formatDate } from "@/lib/format/inventory";

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

export function ItemSourcingEditor({ data }: { data: ItemSourcingData }) {
  const router = useRouter();
  const { canManage, itemId, vendorOptions, sources } = data;
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ItemVendorSource | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const attachedVendorIds = new Set(sources.map((s) => s.vendorId));
  const addableVendors = vendorOptions.filter(
    (v) => !attachedVendorIds.has(v.id)
  );

  const preferred = sources.find((s) => s.isPreferred) ?? null;

  const openAdd = () => {
    setEditing(null);
    setDialogOpen(true);
  };
  const openEdit = (source: ItemVendorSource) => {
    setEditing(source);
    setDialogOpen(true);
  };

  const makePreferred = (source: ItemVendorSource) => {
    setError(null);
    startTransition(async () => {
      const result = await setPreferredItemVendorAction(itemId, source.id);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setMessage(`${source.vendorName} is now the preferred vendor.`);
      router.refresh();
    });
  };

  const remove = (source: ItemVendorSource) => {
    if (
      !window.confirm(`Remove ${source.vendorName} as a source for this item?`)
    ) {
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await removeItemVendorAction(itemId, source.id);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setMessage(`Removed ${source.vendorName}.`);
      router.refresh();
    });
  };

  return (
    <>
      {message ? <Alert variant="success" message={message} /> : null}
      {error ? <Alert variant="error" message={error} /> : null}

      {/* "Where to buy" — the preferred source at a glance. */}
      <section className="panel">
        <div className="panel-header">
          <h2 className="section-heading">Where to buy</h2>
          {preferred ? <Badge variant="success">Preferred</Badge> : null}
        </div>
        <div className="p-4">
          {preferred ? (
            <div className="space-y-3">
              <p className="text-lg font-medium text-[var(--color-fg)]">
                {preferred.vendorName}
              </p>
              <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {detail("Vendor SKU", preferred.vendorSku)}
                {detail("Pack size", preferred.packSize)}
                {detail("Typical order qty", preferred.typicalOrderQuantity)}
                {detail(
                  "Lead time",
                  preferred.leadTimeDays === null
                    ? null
                    : `${preferred.leadTimeDays} days`
                )}
                {detail(
                  "Typical cost",
                  preferred.typicalCost === null
                    ? null
                    : `$${preferred.typicalCost.toFixed(2)}`
                )}
                {detail(
                  "Last ordered",
                  preferred.lastOrderDate
                    ? formatDate(preferred.lastOrderDate)
                    : null
                )}
                {detail("Manufacturer", preferred.manufacturer)}
                {detail("Mfr part #", preferred.manufacturerPartNumber)}
              </dl>
              {preferred.orderingUrl ? (
                <a
                  href={preferred.orderingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block text-sm font-medium text-[var(--color-primary)] hover:underline"
                >
                  Open ordering page →
                </a>
              ) : null}
              {preferred.orderingNotes ? (
                <p className="text-sm text-[var(--color-fg-muted)]">
                  {preferred.orderingNotes}
                </p>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-[var(--color-fg-muted)]">
              No preferred vendor set yet. Add a source and mark it preferred so
              staff know where to reorder this item.
            </p>
          )}
        </div>
      </section>

      <PageSection
        title="All vendor sources"
        action={
          canManage ? (
            <Button
              type="button"
              onClick={openAdd}
              disabled={addableVendors.length === 0 && sources.length > 0}
            >
              Add vendor source
            </Button>
          ) : null
        }
      >
        {sources.length === 0 ? (
          <EmptyState
            title="No vendor sources yet"
            description={
              canManage
                ? "Add a vendor to record where this item is ordered."
                : "No ordering information has been recorded for this item."
            }
          />
        ) : (
          <div className="space-y-3">
            {sources.map((source) => (
              <div key={source.id} className="card card-body space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-[var(--color-fg)]">
                      {source.vendorName}
                    </span>
                    {source.isPreferred ? (
                      <Badge variant="success">Preferred</Badge>
                    ) : null}
                  </div>
                  {canManage ? (
                    <div className="flex flex-wrap gap-2">
                      {!source.isPreferred ? (
                        <Button
                          type="button"
                          variant="secondary"
                          disabled={isPending}
                          onClick={() => makePreferred(source)}
                        >
                          Make preferred
                        </Button>
                      ) : null}
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => openEdit(source)}
                      >
                        Edit
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        disabled={isPending}
                        onClick={() => remove(source)}
                      >
                        Remove
                      </Button>
                    </div>
                  ) : null}
                </div>
                <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {detail("Vendor SKU", source.vendorSku)}
                  {detail("Pack size", source.packSize)}
                  {detail("Typical order qty", source.typicalOrderQuantity)}
                  {detail(
                    "Lead time",
                    source.leadTimeDays === null
                      ? null
                      : `${source.leadTimeDays} days`
                  )}
                  {detail(
                    "Typical cost",
                    source.typicalCost === null
                      ? null
                      : `$${source.typicalCost.toFixed(2)}`
                  )}
                  {detail(
                    "Last ordered",
                    source.lastOrderDate
                      ? formatDate(source.lastOrderDate)
                      : null
                  )}
                  {detail("Manufacturer", source.manufacturer)}
                  {detail("Mfr part #", source.manufacturerPartNumber)}
                </dl>
                {source.orderingUrl ? (
                  <a
                    href={source.orderingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block text-sm font-medium text-[var(--color-primary)] hover:underline"
                  >
                    Ordering page →
                  </a>
                ) : null}
                {source.orderingNotes ? (
                  <p className="text-sm text-[var(--color-fg-muted)]">
                    {source.orderingNotes}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </PageSection>

      {dialogOpen ? (
        <ItemVendorFormDialog
          key={editing?.id ?? "add"}
          open
          itemId={itemId}
          source={editing}
          vendorOptions={editing ? vendorOptions : addableVendors}
          onClose={() => {
            setDialogOpen(false);
            setEditing(null);
          }}
          onSuccess={(text) => {
            setMessage(text);
            router.refresh();
          }}
        />
      ) : null}
    </>
  );
}
