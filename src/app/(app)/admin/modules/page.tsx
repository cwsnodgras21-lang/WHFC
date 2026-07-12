import { AdminModulesPageContent } from "@/components/admin/admin-modules-page-content";
import { requireSession } from "@/lib/auth/session";
import { getAdminModulesPageData } from "@/lib/data/admin-modules-page";
import { createClient } from "@/lib/supabase/server";

export default async function AdminModulesPage() {
  const session = await requireSession();
  const supabase = await createClient();
  const data = await getAdminModulesPageData(supabase, session);

  return <AdminModulesPageContent data={data} />;
}
