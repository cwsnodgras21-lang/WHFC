import { SamplesPageContent } from "@/components/samples/samples-page-content";
import { canManageSampleProducts } from "@/lib/auth/permissions";
import { requireSession } from "@/lib/auth/session";
import { getSamplesPageData } from "@/lib/data/samples";
import { ModulePageGuard } from "@/lib/modules/guard";
import { createClient } from "@/lib/supabase/server";

export default async function SamplesPage() {
  const session = await requireSession();
  const supabase = await createClient();
  const data = await getSamplesPageData(supabase, session);

  return (
    <ModulePageGuard moduleKey="samples">
      <SamplesPageContent
        data={data}
        canManageProducts={canManageSampleProducts(
          session.profile.role,
          session.profile.active
        )}
      />
    </ModulePageGuard>
  );
}
