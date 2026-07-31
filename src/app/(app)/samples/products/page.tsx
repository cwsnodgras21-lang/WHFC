import { SampleProductsPageContent } from "@/components/samples/sample-products-page-content";
import { requireSession } from "@/lib/auth/session";
import { getSampleProductsPageData } from "@/lib/data/sample-products";
import { ModulePageGuard } from "@/lib/modules/guard";
import { createClient } from "@/lib/supabase/server";

export default async function SampleProductsPage() {
  const session = await requireSession();
  const supabase = await createClient();
  const data = await getSampleProductsPageData(supabase, session);

  return (
    <ModulePageGuard moduleKey="samples">
      <SampleProductsPageContent data={data} />
    </ModulePageGuard>
  );
}
