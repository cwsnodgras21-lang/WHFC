"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { startPhysicalCountAction } from "@/lib/actions/physical-counts";
import { Alert } from "@/components/ui/alert";
import { Button, LinkButton } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { FormField, FormSection, FormSelect } from "@/components/ui/form-field";

type StartCountFormProps = {
  locations: Array<{
    id: string;
    locationName: string;
    room: string | null;
    hasActiveCount: boolean;
  }>;
};

export function StartCountForm({ locations }: StartCountFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [locationId, setLocationId] = useState("");
  const [error, setError] = useState<string | null>(null);

  const availableLocations = locations.filter(
    (location) => !location.hasActiveCount
  );

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await startPhysicalCountAction({ locationId });
      if (result?.success === false) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <>
      {locations.length === 0 ? (
        <EmptyState
          title="Add a storage location"
          description="Physical counts run at a specific location — add one before you start."
          action={
            <LinkButton href="/locations" variant="primary">
              Go to locations
            </LinkButton>
          }
        />
      ) : (
    <form onSubmit={handleSubmit} noValidate>
      <FormSection
        title="Start a new count"
        description="Pick a location, count what's on the shelf, then update quantities to match."
      >
        {error ? <Alert variant="error" message={error} /> : null}

        <FormField id="start-count-location" label="Location">
          <FormSelect
            id="start-count-location"
            value={locationId}
            disabled={isPending || availableLocations.length === 0}
            onChange={(event) => setLocationId(event.target.value)}
          >
            <option value="">Select location…</option>
            {locations.map((location) => (
              <option
                key={location.id}
                value={location.id}
                disabled={location.hasActiveCount}
              >
                {location.locationName}
                {location.room ? ` — ${location.room}` : ""}
                {location.hasActiveCount ? " (count in progress)" : ""}
              </option>
            ))}
          </FormSelect>
        </FormField>

        <div className="flex justify-end">
          <Button
            type="submit"
            variant="primary"
            disabled={isPending || !locationId || availableLocations.length === 0}
          >
            {isPending ? "Starting…" : "Start count"}
          </Button>
        </div>
      </FormSection>
    </form>
      )}
    </>
  );
}
