import { ReceivePageContent } from "@/components/inventory/receive-page-content";
import { requireSession } from "@/lib/auth/session";
import { getReceivePageData } from "@/lib/data/receive";
import { createClient } from "@/lib/supabase/server";

export default async function ReceivePage() {
  const session = await requireSession();
  const supabase = await createClient();
  const data = await getReceivePageData(supabase, session);

  return <ReceivePageContent data={data} />;
}
