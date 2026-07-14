"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { setLocationActiveAction } from "@/lib/actions/locations";
import { LocationFormDialog } from "@/components/locations/location-form-dialog";
import type { LocationRow } from "@/lib/data/locations-page";
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

export function matchesLocationSearch(
  location: LocationRow,
  query: string
): boolean {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return true;
  }

  return [
    location.locationName,
    location.room,
    location.cabinet,
    location.shelf,
    location.bin,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .includes(normalized);
}

export function resolveLocationDialogMode(
  canManage: boolean
): "edit" | "view" {
  return canManage ? "edit" : "view";
}

function matchesStatus(location: LocationRow, filter: StatusFilter): boolean {
  if (filter === "active") {
    return location.active;
  }
  if (filter === "inactive") {
    return !location.active;
  }
  return true;
}

export function LocationsCatalog({
  locations,
  canManage,
  initialStatusFilter = "all",
}: {
  locations: LocationRow[];
  canManage: boolean;
  initialStatusFilter?: StatusFilter;
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<StatusFilter>(initialStatusFilter);
  const [dialogMode, setDialogMode] = useState<DialogMode>(null);
  const [selected, setSelected] = useState<LocationRow | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isToggling, startToggle] = useTransition();

  const filteredLocations = useMemo(
    () =>
      locations.filter(
        (location) =>
          matchesLocationSearch(location, search) &&
          matchesStatus(location, statusFilter)
      ),
    [locations, search, statusFilter]
  );

  const openCreate = () => {
    setActionError(null);
    setSelected(null);
    setDialogMode("create");
  };

  const openLocation = (location: LocationRow) => {
    setActionError(null);
    setSelected(location);
    setDialogMode(resolveLocationDialogMode(canManage));
  };

  const handleSuccess = (message: string) => {
    setSuccessMessage(message);
    setActionError(null);
    router.refresh();
  };

  const handleToggleActive = (
    location: LocationRow,
    event: React.MouseEvent
  ) => {
    event.stopPropagation();
    const nextActive = !location.active;
    const confirmMessage = nextActive
      ? `Activate "${location.locationName}"?`
      : `Deactivate "${location.locationName}"? The location will remain available in inventory history.`;

    if (!window.confirm(confirmMessage)) {
      return;
    }

    setActionError(null);
    setSuccessMessage(null);

    startToggle(async () => {
      const result = await setLocationActiveAction(location.id, nextActive);
      if (!result.success) {
        setActionError(result.error);
        return;
      }

      setSuccessMessage(
        nextActive
          ? `Activated "${location.locationName}".`
          : `Deactivated "${location.locationName}".`
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
        title="Location catalog"
        id="locations-catalog-heading"
        action={
          canManage ? (
            <Button type="button" onClick={openCreate}>
              New location
            </Button>
          ) : null
        }
      >
        <div className="card card-body space-y-4">
          <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
            <FormField
              id="location-search"
              label="Search by location, room, cabinet, shelf, or bin"
            >
              <FormInput
                id="location-search"
                type="search"
                placeholder="Search locations..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </FormField>

            <FormField id="location-status-filter" label="Status">
              <FormSelect
                id="location-status-filter"
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value as StatusFilter)
                }
              >
                <option value="all">All locations</option>
                <option value="active">Active only</option>
                <option value="inactive">Inactive only</option>
              </FormSelect>
            </FormField>
          </div>

          {locations.length === 0 ? (
            <EmptyState
              title="No locations yet"
              description={
                canManage
                  ? "Create the first storage location to support receiving and consuming inventory."
                  : "An inventory manager needs to add storage locations."
              }
            />
          ) : filteredLocations.length === 0 ? (
            <EmptyState
              title="No matching locations"
              description="Try a different search term or status filter."
            />
          ) : (
            <DataTableShell>
              <DataTable>
                <thead>
                  <tr>
                    <th scope="col">Location</th>
                    <th scope="col">Room</th>
                    <th scope="col">Cabinet</th>
                    <th scope="col">Shelf</th>
                    <th scope="col">Bin</th>
                    <th scope="col">Status</th>
                    <th scope="col">{canManage ? "Actions" : "Details"}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLocations.map((location) => (
                    <tr
                      key={location.id}
                      className={cn(
                        "data-table-row-clickable",
                        !location.active && "data-table-row-inactive"
                      )}
                      onClick={() => openLocation(location)}
                    >
                      <td>
                        <div className="flex flex-col gap-1">
                          <span
                            className={cn(
                              !location.active &&
                                "text-[var(--color-fg-muted)]"
                            )}
                          >
                            {location.locationName}
                          </span>
                          {location.hasTransactions ? (
                            <span className="text-xs text-[var(--color-fg-muted)]">
                              History locked
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td>{location.room ?? "-"}</td>
                      <td>{location.cabinet ?? "-"}</td>
                      <td>{location.shelf ?? "-"}</td>
                      <td>{location.bin ?? "-"}</td>
                      <td>
                        <Badge variant={location.active ? "success" : "default"}>
                          {location.active ? "Active" : "Inactive"}
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
                            onClick={() => openLocation(location)}
                          >
                            {canManage ? "Edit" : "View"}
                          </Button>
                          {canManage ? (
                            <Button
                              type="button"
                              variant={
                                location.active ? "destructive" : "secondary"
                              }
                              disabled={isToggling}
                              onClick={(event) =>
                                handleToggleActive(location, event)
                              }
                            >
                              {location.active ? "Deactivate" : "Activate"}
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
        <LocationFormDialog
          key={
            dialogMode === "create" ? "create" : `${dialogMode}-${selected?.id}`
          }
          open
          mode={dialogMode}
          location={selected}
          canManage={canManage}
          onClose={() => {
            setDialogMode(null);
            setSelected(null);
          }}
          onSuccess={handleSuccess}
        />
      ) : null}
    </>
  );
}
