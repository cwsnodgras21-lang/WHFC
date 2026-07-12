import Link from "next/link";

import type { GettingStartedProgress } from "@/lib/data/getting-started";
import { cn } from "@/lib/cn";

type GettingStartedCardProps = {
  progress: GettingStartedProgress;
};

export function GettingStartedCard({ progress }: GettingStartedCardProps) {
  if (progress.isComplete) {
    return null;
  }

  const applicableSteps = progress.steps.filter((step) => step.applicable);

  return (
    <section aria-labelledby="getting-started-heading" className="panel">
      <div className="panel-header panel-header-attention">
        <h2 id="getting-started-heading" className="section-heading">
          Getting started
        </h2>
        <span className="text-sm text-muted">
          {progress.completedCount} of {progress.applicableCount} done
        </span>
      </div>

      <ol className="divide-y divide-[var(--color-border)]">
        {applicableSteps.map((step) => (
          <li key={step.id} className="flex items-start gap-3 px-4 py-3">
            <span
              className={cn(
                "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                step.complete
                  ? "bg-[var(--color-success-muted)] text-[var(--color-success)]"
                  : "bg-[var(--color-surface-muted)] text-muted"
              )}
              aria-hidden
            >
              {step.complete ? "✓" : ""}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium text-[var(--color-fg)]">{step.label}</p>
                {!step.complete ? (
                  <Link href={step.href} className="link-subtle text-sm">
                    Go →
                  </Link>
                ) : (
                  <span className="text-xs text-muted">Done</span>
                )}
              </div>
              <p className="mt-0.5 text-sm text-muted">{step.description}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
