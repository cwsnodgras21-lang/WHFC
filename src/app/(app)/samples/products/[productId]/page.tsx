import { SampleProductEditor } from "@/components/samples/sample-product-editor";
import { PageHeader } from "@/components/ui/page-header";
import { ErrorState } from "@/components/ui/error-state";
import { requireSession } from "@/lib/auth/session";
import { getSampleProductEditorData } from "@/lib/data/sample-products";
import { ModulePageGuard } from "@/lib/modules/guard";
import { createClient } from "@/lib/supabase/server";

type PageProps = {
  params: Promise<{ productId: string }>;
};

export default async function EditSampleProductPage({ params }: PageProps) {
  const { productId } = await params;
  const session = await requireSession();
  const supabase = await createClient();
  const data = await getSampleProductEditorData(supabase, session, productId);

  return (
    <ModulePageGuard moduleKey="samples">
      <div className="space-y-6">
        <PageHeader title={data.product?.productName ?? "Edit sample product"} />
        {!data.canManage ? (
          <ErrorState
            title="Access denied"
            message={data.permissionMessage ?? "You cannot manage sample products."}
          />
        ) : data.loadError ? (
          <ErrorState title="Unable to load form data" message={data.loadError} />
        ) : !data.product ? (
          <ErrorState title="Not found" message="That sample product no longer exists." />
        ) : (
          <SampleProductEditor data={data} productId={productId} />
        )}
      </div>
    </ModulePageGuard>
  );
}
