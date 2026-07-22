import Link from "next/link";
import { notFound } from "next/navigation";

import { ItemDetailContent } from "@/components/items/item-detail-content";
import { ErrorState } from "@/components/ui/error-state";
import { PageHeader } from "@/components/ui/page-header";
import { requireSession } from "@/lib/auth/session";
import { getItemDetailData } from "@/lib/data/item-detail";
import { createClient } from "@/lib/supabase/server";

type ItemDetailPageProps = {
  params: Promise<{ itemId: string }>;
};

export default async function ItemDetailPage({ params }: ItemDetailPageProps) {
  const session = await requireSession();
  const supabase = await createClient();
  const { itemId } = await params;
  const data = await getItemDetailData(supabase, session, itemId);

  if (!data) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={data.itemName || "Item"}
        description={
          data.internalSku ? `Product code ${data.internalSku}` : undefined
        }
        actions={
          <Link href="/items" className="link-subtle">
            ← Back to items
          </Link>
        }
      />

      {!data.canView ? (
        <ErrorState
          title="Access denied"
          message={
            data.permissionMessage ?? "Your account cannot view this item."
          }
        />
      ) : data.loadError ? (
        <ErrorState title="Could not load item" message={data.loadError} />
      ) : (
        <ItemDetailContent data={data} />
      )}
    </div>
  );
}
