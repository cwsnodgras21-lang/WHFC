"use client";

import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import { PageHeader } from "@/components/ui/page-header";

type AppErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function AppError({ error, reset }: AppErrorProps) {
  return (
    <div className="space-y-4">
      <PageHeader title="Something went wrong" eyebrow="" />
      <ErrorState message={error.message || "An unexpected error occurred."} />
      <Button type="button" variant="primary" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
