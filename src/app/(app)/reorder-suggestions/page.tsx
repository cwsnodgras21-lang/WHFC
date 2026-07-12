import { ReorderSuggestionsPageContent } from "@/components/reorder-suggestions/reorder-suggestions-page-content";
import { requireSession } from "@/lib/auth/session";
import { getReorderSuggestionsPageData } from "@/lib/data/reorder-suggestions-page";
import { ModulePageGuard } from "@/lib/modules/guard";
import { createClient } from "@/lib/supabase/server";

export default async function ReorderSuggestionsPage() {
  const session = await requireSession();
  const supabase = await createClient();
  const data = await getReorderSuggestionsPageData(supabase, session);

  return (
    <ModulePageGuard moduleKey="reorder_suggestions">
      <ReorderSuggestionsPageContent data={data} />
    </ModulePageGuard>
  );
}
