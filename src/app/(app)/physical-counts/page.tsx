import { PhysicalCountsPageContent } from "@/components/physical-counts/physical-counts-page-content";
import { requireSession } from "@/lib/auth/session";
import { getPhysicalCountsPageData } from "@/lib/data/physical-counts";
import { createClient } from "@/lib/supabase/server";

export default async function PhysicalCountsPage() {
  const session = await requireSession();
  const supabase = await createClient();
  const data = await getPhysicalCountsPageData(supabase, session);

  return <PhysicalCountsPageContent data={data} />;
}
