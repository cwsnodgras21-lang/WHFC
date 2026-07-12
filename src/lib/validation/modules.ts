import { z } from "zod";

import { MODULE_KEYS, type ModuleKey } from "@/lib/modules/types";

const moduleKeySchema = z.custom<ModuleKey>(
  (value) => typeof value === "string" && MODULE_KEYS.includes(value as ModuleKey),
  "Invalid module key."
);

export const updateModuleSettingsSchema = z.object({
  settings: z.array(
    z.object({
      moduleKey: moduleKeySchema,
      enabled: z.boolean(),
    })
  ),
});

export type UpdateModuleSettingsInput = z.infer<typeof updateModuleSettingsSchema>;
