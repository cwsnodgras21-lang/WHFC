import { UnitsPageContent } from "@/components/units/units-page-content";
import { getUnitsPageData } from "@/lib/data/units-page";
import { requireSession } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export default async function UnitsPage() {
  const session = await requireSession();
  const supabase = await createClient();
  return <UnitsPageContent data={await getUnitsPageData(supabase, session)} />;
}
