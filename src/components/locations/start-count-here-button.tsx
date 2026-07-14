"use client";

import { useState, useTransition } from "react";

import { startPhysicalCountAction } from "@/lib/actions/physical-counts";
import { Alert } from "@/components/ui/alert";
import { Button, LinkButton } from "@/components/ui/button";

type StartCountHereButtonProps = {
  locationId: string;
  activeCountId: string | null;
};

export function StartCountHereButton({
  locationId,
  activeCountId,
}: StartCountHereButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (activeCountId) {
    return (
      <LinkButton href={`/physical-counts/${activeCountId}`} variant="primary">
        Resume count in progress
      </LinkButton>
    );
  }

  function handleClick() {
    setError(null);
    startTransition(async () => {
      const result = await startPhysicalCountAction({ locationId });
      if (result?.success === false) {
        setError(result.error);
      }
    });
  }

  return (
    <div className="space-y-2">
      <Button variant="primary" disabled={isPending} onClick={handleClick}>
        {isPending ? "Starting…" : "Start count here"}
      </Button>
      {error ? <Alert variant="error" message={error} /> : null}
    </div>
  );
}
