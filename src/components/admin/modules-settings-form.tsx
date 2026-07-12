"use client";

import { useState, useTransition } from "react";

import { updateModuleSettingsAction } from "@/lib/actions/modules";
import type { AdminModuleRow } from "@/lib/data/admin-modules-page";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

type ModulesSettingsFormProps = {
  initialModules: AdminModuleRow[];
};

export function ModulesSettingsForm({ initialModules }: ModulesSettingsFormProps) {
  const [modules, setModules] = useState(initialModules);
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function toggleModule(moduleKey: AdminModuleRow["key"]) {
    setModules((current) =>
      current.map((row) =>
        row.key === moduleKey && !row.locked
          ? { ...row, enabled: !row.enabled }
          : row
      )
    );
  }

  function handleSave() {
    setServerError(null);
    setSuccessMessage(null);

    startTransition(async () => {
      const result = await updateModuleSettingsAction({
        settings: modules.map((row) => ({
          moduleKey: row.key,
          enabled: row.enabled,
        })),
      });

      if (!result.success) {
        setServerError(result.error ?? "Unable to save module settings.");
        return;
      }

      setSuccessMessage("Module settings saved. Navigation and dashboard will update.");
    });
  }

  return (
    <div className="space-y-4">
      {serverError ? <Alert variant="error" message={serverError} /> : null}
      {successMessage ? <Alert variant="success" message={successMessage} /> : null}

      <div className="space-y-3">
        {modules.map((module) => (
          <label
            key={module.key}
            className={cn(
              "card card-body flex items-start gap-4",
              module.locked && "opacity-80"
            )}
          >
            <input
              type="checkbox"
              className="mt-1"
              checked={module.enabled}
              disabled={module.locked || isPending}
              onChange={() => toggleModule(module.key)}
            />
            <span className="min-w-0 flex-1">
              <span className="block font-medium text-[var(--color-fg)]">
                {module.label}
                {module.locked ? (
                  <span className="ml-2 text-xs font-normal text-muted">
                    Always on
                  </span>
                ) : null}
              </span>
              <span className="mt-1 block text-sm text-muted">
                {module.description}
              </span>
            </span>
          </label>
        ))}
      </div>

      <Button type="button" variant="primary" disabled={isPending} onClick={handleSave}>
        Save module settings
      </Button>
    </div>
  );
}
