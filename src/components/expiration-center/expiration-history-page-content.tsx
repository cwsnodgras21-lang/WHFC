import Link from "next/link";

import { RecentActivity } from "@/components/activity/recent-activity";
import { ErrorState } from "@/components/ui/error-state";
import { LinkButton } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import type { ActivityFeedItem } from "@/lib/data/activity-feed";

type ExpirationHistoryPageContentProps = {
  items: ActivityFeedItem[];
  loadError: string | null;
  canView: boolean;
  permissionMessage?: string | null;
};

export function ExpirationHistoryPageContent({
  items,
  loadError,
  canView,
  permissionMessage = null,
}: ExpirationHistoryPageContentProps) {
  if (!canView) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Expiration history"
          description="Disposals, reviews, and other expiration activity."
        />
        <ErrorState
          title="Access denied"
          message={
            permissionMessage ??
            "Your account cannot view expiration history."
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Expiration history"
        description="A timeline of disposals, reviews, and related expiration events."
        actions={
          <LinkButton href="/expiration" variant="secondary">
            Back to expiration center
          </LinkButton>
        }
      />

      {loadError ? (
        <ErrorState
          title="Unable to load history"
          message={loadError}
        />
      ) : (
        <RecentActivity
          items={items}
          title="Expiration activity"
          maxItems={100}
          showFilters={false}
        />
      )}

      <p className="text-sm text-[var(--color-fg-muted)]">
        Inventory ledger detail is also available in{" "}
        <Link
          href="/transactions"
          className="font-medium text-[var(--color-primary)] hover:underline"
        >
          Transactions
        </Link>
        .
      </p>
    </div>
  );
}
