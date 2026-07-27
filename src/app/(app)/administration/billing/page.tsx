import { BillingPageContent } from "@/components/administration/billing/billing-page-content";
import { requireSession } from "@/lib/auth/session";
import { getBillingPageData } from "@/lib/data/billing-page";

export default async function BillingPage() {
  const session = await requireSession();
  const data = await getBillingPageData(session);

  return <BillingPageContent data={data} />;
}
