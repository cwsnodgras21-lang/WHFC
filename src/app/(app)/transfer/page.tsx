import { TransferPageContent } from "@/components/inventory/transfer-page-content";
import { requireSession } from "@/lib/auth/session";
import { getTransferPageData } from "@/lib/data/transfer";
import { createClient } from "@/lib/supabase/server";

export default async function TransferPage() {
  const session = await requireSession();
  const supabase = await createClient();
  const data = await getTransferPageData(supabase, session);

  return <TransferPageContent data={data} />;
}
