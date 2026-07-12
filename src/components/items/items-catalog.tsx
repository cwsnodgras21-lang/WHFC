"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { setItemActiveAction } from "@/lib/actions/items";
import type {
  ItemCatalogRow,
  ReferenceDataSnapshot,
} from "@/lib/data/items-page";
import { formatQuantity } from "@/lib/format/inventory";
import { ItemFormDialog } from "@/components/items/item-form-dialog";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, DataTableShell } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { FormField, FormInput, FormSelect } from "@/components/ui/form-field";
import { PageSection } from "@/components/ui/page-section";
import { cn } from "@/lib/cn";

type StatusFilter = "all" | "active" | "inactive";
type DialogMode = "create" | "edit" | "view" | null;

type ItemsCatalogProps = {
  items: ItemCatalogRow[];
  referenceData: ReferenceDataSnapshot;
  canManage: boolean;
};

function matchesSearch(item: ItemCatalogRow, query: string): boolean {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return true;
  }
  return (
    item.itemName.toLowerCase().includes(normalized) ||
    item.internalSku.toLowerCase().includes(normalized)
  );
}

function matchesStatus(item: ItemCatalogRow, filter: StatusFilter): boolean {
  if (filter === "active") {
    return item.active;
  }
  if (filter === "inactive") {
    return !item.active;
  }
  return true;
}

export function ItemsCatalog({
  items,
  referenceData,
  canManage,
}: ItemsCatalogProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [dialogMode, setDialogMode] = useState<DialogMode>(null);
  const [editingItem, setEditingItem] = useState<ItemCatalogRow | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isToggling, startToggle] = useTransition();

  const filteredItems = useMemo(
    () =>
      items.filter(
        (item) => matchesSearch(item, search) && matchesStatus(item, statusFilter)
      ),
    [items, search, statusFilter]
  );

  const openCreate = () => {
    setActionError(null);
    setEditingItem(null);
    setDialogMode("create");
  };

  const openItem = (item: ItemCatalogRow) => {
    setActionError(null);
    setEditingItem(item);
    setDialogMode(canManage ? "edit" : "view");
  };

  const closeDialog = () => {
    setDialogMode(null);
    setEditingItem(null);
  };

  const handleSuccess = (message: string) => {
    setSuccessMessage(message);
    setActionError(null);
    router.refresh();
  };

  const handleToggleActive = (
    item: ItemCatalogRow,
    event: React.MouseEvent
  ) => {
    event.stopPropagation();
    const nextActive = !item.active;
    const confirmMessage = nextActive
      ? `Reactivate "${item.itemName}"?`
      : `Deactivate "${item.itemName}"? The item will remain in history but won't appear in receive/consume pick lists.`;

    if (!window.confirm(confirmMessage)) {
      return;
    }

    setActionError(null);
    setSuccessMessage(null);

    startToggle(async () => {
      const result = await setItemActiveAction(item.id, nextActive);
      if (!result.success) {
        setActionError(result.error);
        return;
      }

      setSuccessMessage(
        nextActive
          ? `Reactivated "${item.itemName}".`
          : `Deactivated "${item.itemName}".`
      );
      router.refresh();
    });
  };

  return (
    <>
      {successMessage ? (
        <Alert variant="success" message={successMessage} />
      ) : null}
      {actionError ? <Alert variant="error" message={actionError} /> : null}

      <PageSection
        title="Catalog"
        id="items-catalog-heading"
        action={
          canManage ? (
            <Button type="button" onClick={openCreate}>
              New item
            </Button>
          ) : null
        }
      >
        <div className="card card-body space-y-4">
          <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
            <FormField id="item-search" label="Search by name or SKU">
              <FormInput
                id="item-search"
                type="search"
                placeholder="Search items…"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </FormField>

            <FormField id="item-status-filter" label="Status">
              <FormSelect
                id="item-status-filter"
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value as StatusFilter)
                }
              >
                <option value="all">All items</option>
                <option value="active">Active only</option>
                <option value="inactive">Inactive only</option>
              </FormSelect>
            </FormField>
          </div>

          {items.length === 0 ? (
            <EmptyState
              title="No items yet"
              description={
                canManage
                  ? "Create the first catalog item to start receiving and consuming stock."
                  : "An inventory manager needs to add catalog items."
              }
            />
          ) : filteredItems.length === 0 ? (
            <EmptyState
              title="No matching items"
              description="Try a different search term or status filter."
            />
          ) : (
            <DataTableShell>
              <DataTable>
                <thead>
                  <tr>
                    <th scope="col">Item</th>
                    <th scope="col">SKU</th>
                    <th scope="col">Category</th>
                    <th scope="col">Unit</th>
                    <th scope="col">Vendor</th>
                    <th scope="col">Reorder</th>
                    <th scope="col">Par</th>
                    <th scope="col">Status</th>
                    <th scope="col">{canManage ? "Actions" : "Details"}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((item) => (
                    <tr
                      key={item.id}
                      className={cn(
                        "data-table-row-clickable",
                        !item.active && "data-table-row-inactive"
                      )}
                      onClick={() => openItem(item)}
                    >
                      <td>
                        <span className={cn(!item.active && "text-[var(--color-fg-muted)]")}>
                          {item.itemName}
                        </span>
                      </td>
                      <td className="font-mono text-xs">{item.internalSku}</td>
                      <td>{item.categoryName}</td>
                      <td>{item.unitAbbreviation}</td>
                      <td>{item.vendorName ?? "—"}</td>
                      <td>{formatQuantity(item.reorderPoint)}</td>
                      <td>{formatQuantity(item.parLevel)}</td>
                      <td>
                        <Badge variant={item.active ? "success" : "default"}>
                          {item.active ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                      <td>
                        <div
                          className="flex flex-wrap gap-2"
                          onClick={(event) => event.stopPropagation()}
                        >
                          <Button
                            type="button"
                            variant="secondary"
                            onClick={() => openItem(item)}
                          >
                            {canManage ? "Edit" : "View"}
                          </Button>
                          {canManage ? (
                            <Button
                              type="button"
                              variant={item.active ? "destructive" : "secondary"}
                              disabled={isToggling}
                              onClick={(event) => handleToggleActive(item, event)}
                            >
                              {item.active ? "Deactivate" : "Activate"}
                            </Button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </DataTable>
            </DataTableShell>
          )}
        </div>
      </PageSection>

      {dialogMode ? (
        <ItemFormDialog
          key={
            dialogMode === "create"
              ? "create"
              : `${dialogMode}-${editingItem?.id}`
          }
          open
          mode={dialogMode}
          item={editingItem}
          referenceData={referenceData}
          canManage={canManage}
          onClose={closeDialog}
          onSuccess={handleSuccess}
        />
      ) : null}
    </>
  );
}
