import Link from "next/link";

import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { MODULE_DEFINITION_BY_KEY } from "@/lib/modules/definitions";
import type { ModuleKey } from "@/lib/modules/types";

type ModuleDisabledStateProps = {
  moduleKey: ModuleKey;
};

export function ModuleDisabledState({ moduleKey }: ModuleDisabledStateProps) {
  const definition = MODULE_DEFINITION_BY_KEY[moduleKey];

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${definition.label} is turned off`}
        description="This feature is not part of your current setup."
      />
      <EmptyState
        title="Not available"
        description="Ask an administrator to turn this on in Module settings if your clinic needs it."
      />
      <div className="flex flex-wrap gap-2">
        <Link href="/dashboard" className="btn btn-primary">
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
