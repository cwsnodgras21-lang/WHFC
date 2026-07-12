import { ItemsPageContent } from "@/components/items/items-page-content";
import { getItemsPageData } from "@/lib/data/items-page";
import { requireSession } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export default async function ItemsPage() {
  const session = await requireSession();
  const supabase = await createClient();
  const data = await getItemsPageData(supabase, session);

  return <ItemsPageContent data={data} />;
}
