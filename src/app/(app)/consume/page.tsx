import { ConsumePageContent } from "@/components/inventory/consume-page-content";
import { requireSession } from "@/lib/auth/session";
import { getConsumePageData } from "@/lib/data/consume";
import { createClient } from "@/lib/supabase/server";

export default async function ConsumePage() {
  const session = await requireSession();
  const supabase = await createClient();
  const data = await getConsumePageData(supabase, session);

  return <ConsumePageContent data={data} />;
}
