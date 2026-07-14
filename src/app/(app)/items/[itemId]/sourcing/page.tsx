import Link from "next/link";
import { notFound } from "next/navigation";

import { ItemSourcingEditor } from "@/components/item-vendors/item-sourcing-editor";
import { ErrorState } from "@/components/ui/error-state";
import { PageHeader } from "@/components/ui/page-header";
import { requireSession } from "@/lib/auth/session";
import { getItemSourcingData } from "@/lib/data/item-sourcing";
import { createClient } from "@/lib/supabase/server";

type ItemSourcingPageProps = {
  params: Promise<{ itemId: string }>;
};

export default async function ItemSourcingPage({
  params,
}: ItemSourcingPageProps) {
  const session = await requireSession();
  const supabase = await createClient();
  const { itemId } = await params;
  const data = await getItemSourcingData(supabase, session, itemId);

  if (!data) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Sourcing — ${data.itemName}`}
        description={`Where to order ${data.internalSku}. Keep the preferred vendor up to date so reorders go to the right place.`}
        actions={
          <Link href="/items" className="link-subtle">
            ← Back to items
          </Link>
        }
      />

      {data.loadError ? (
        <ErrorState
          title="Could not load sourcing"
          message={data.loadError}
        />
      ) : (
        <ItemSourcingEditor data={data} />
      )}
    </div>
  );
}
