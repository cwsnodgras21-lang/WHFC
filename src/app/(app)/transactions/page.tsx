import { TransactionsPageContent } from "@/components/transactions/transactions-page-content";
import { getTransactionsPageData } from "@/lib/data/transactions-page";
import { requireSession } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { parseTransactionsPageFilters } from "@/lib/validation/transactions-page";

type TransactionsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function TransactionsPage({
  searchParams,
}: TransactionsPageProps) {
  const session = await requireSession();
  const supabase = await createClient();
  const filters = parseTransactionsPageFilters(await searchParams);
  const data = await getTransactionsPageData(supabase, session, filters);

  return <TransactionsPageContent data={data} />;
}
