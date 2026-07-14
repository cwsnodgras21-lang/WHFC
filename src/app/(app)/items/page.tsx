import { ItemsPageContent } from "@/components/items/items-page-content";
import { getItemsPageData } from "@/lib/data/items-page";
import { requireSession } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { parseActiveStatusFilter } from "@/lib/validation/catalog-filters";

type ItemsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ItemsPage({ searchParams }: ItemsPageProps) {
  const session = await requireSession();
  const supabase = await createClient();
  const [data, params] = await Promise.all([
    getItemsPageData(supabase, session),
    searchParams,
  ]);

  return (
    <ItemsPageContent
      data={data}
      initialStatusFilter={parseActiveStatusFilter(params.status)}
    />
  );
}
