import { z } from "zod";

const CALCULATION_TYPES = ["concentration", "multiplier"] as const;

export const procedureKitComponentFormSchema = z.object({
  id: z.string().optional(),
  itemId: z.string().min(1, "Select an item.").uuid("Select an item."),
  quantity: z
    .string()
    .min(1, "Enter a quantity.")
    .refine((v) => {
      const n = Number(v);
      return !Number.isNaN(n) && n > 0;
    }, "Quantity must be greater than zero."),
  unit: z.string().min(1, "Enter a unit.").max(20, "Unit is too long."),
  isVariableQuantity: z.boolean(),
  variableQuantityLabel: z.string().optional(),
  variableQuantityUnit: z.string().optional(),
  calculationType: z.enum(CALCULATION_TYPES).optional().or(z.literal("")),
  multiplier: z.string().optional(),
  concentrationAmount: z.string().optional(),
  concentrationUnit: z.string().optional(),
  concentrationVolume: z.string().optional(),
  concentrationVolumeUnit: z.string().optional(),
  required: z.boolean(),
  dosagePresets: z
    .string()
    .optional()
    .refine((v) => {
      if (!v?.trim()) return true;
      const parts = v.split(",").map((p) => p.trim()).filter(Boolean);
      if (parts.length > 8) return false;
      return parts.every((p) => {
        const n = Number(p);
        return !Number.isNaN(n) && n > 0;
      });
    }, "Enter up to 8 positive numbers separated by commas."),
});

export const procedureKitFormSchema = z.object({
  name: z
    .string()
    .min(1, "Enter a kit name.")
    .max(120, "Name is too long."),
  description: z.string().max(500, "Description is too long.").optional(),
  instructions: z
    .string()
    .max(2000, "Instructions are too long.")
    .optional(),
  categoryId: z.string().optional(),
  active: z.boolean(),
  defaultLocationId: z.string().optional(),
  components: z
    .array(procedureKitComponentFormSchema)
    .min(1, "Add at least one component."),
});

export type ProcedureKitFormValues = z.infer<typeof procedureKitFormSchema>;

const optionalPositiveNumber = z
  .union([
    z.coerce.number().positive(),
    z.literal("").transform(() => undefined),
    z.undefined(),
  ])
  .optional();

export const procedureKitComponentSchema = z
  .object({
    id: z.uuid().optional(),
    itemId: z.uuid("Select an item."),
    quantity: z.coerce
      .number()
      .positive("Quantity must be greater than zero.")
      .max(999_999.999),
    unit: z.string().min(1).max(20),
    isVariableQuantity: z.boolean(),
    variableQuantityLabel: z.string().max(80).optional().nullable(),
    variableQuantityUnit: z.string().max(20).optional().nullable(),
    calculationType: z.enum(CALCULATION_TYPES).optional().nullable(),
    multiplier: optionalPositiveNumber,
    concentrationAmount: optionalPositiveNumber,
    concentrationUnit: z.string().max(20).optional().nullable(),
    concentrationVolume: optionalPositiveNumber,
    concentrationVolumeUnit: z.string().max(20).optional().nullable(),
    required: z.boolean(),
    displayOrder: z.coerce.number().int().min(0).default(0),
    dosagePresets: z
      .array(z.coerce.number().positive().max(999_999.999))
      .max(8)
      .optional()
      .nullable(),
  })
  .superRefine((data, ctx) => {
    if (data.dosagePresets && data.dosagePresets.length > 0 && !data.isVariableQuantity) {
      ctx.addIssue({
        code: "custom",
        message: "Dosage presets only apply to adjustable components.",
        path: ["dosagePresets"],
      });
    }
    if (data.isVariableQuantity) {
      if (!data.variableQuantityLabel?.trim()) {
        ctx.addIssue({
          code: "custom",
          message: "Enter a label for the administered amount.",
          path: ["variableQuantityLabel"],
        });
      }
      if (!data.variableQuantityUnit?.trim()) {
        ctx.addIssue({
          code: "custom",
          message: "Enter the administered amount unit.",
          path: ["variableQuantityUnit"],
        });
      }
      if (!data.calculationType) {
        ctx.addIssue({
          code: "custom",
          message: "Select a calculation type for variable components.",
          path: ["calculationType"],
        });
      }
      if (data.calculationType === "concentration") {
        if (!data.concentrationAmount || !data.concentrationVolume) {
          ctx.addIssue({
            code: "custom",
            message: "Enter concentration amount and volume.",
            path: ["concentrationAmount"],
          });
        }
      }
      if (data.calculationType === "multiplier" && !data.multiplier) {
        ctx.addIssue({
          code: "custom",
          message: "Enter a multiplier.",
          path: ["multiplier"],
        });
      }
    }
  });

export const saveProcedureKitSchema = z.object({
  id: z.uuid().optional(),
  name: z.string().min(1).max(120),
  description: z.string().max(500).optional().nullable(),
  instructions: z.string().max(2000).optional().nullable(),
  categoryId: z.uuid().optional().nullable(),
  active: z.boolean(),
  defaultLocationId: z.uuid().optional().nullable(),
  components: z.array(procedureKitComponentSchema).min(1),
});

export type SaveProcedureKitInput = z.infer<typeof saveProcedureKitSchema>;

export const procedureMappingSchema = z.object({
  id: z.uuid().optional(),
  sourceSystem: z.string().min(1).max(80),
  externalCode: z.string().min(1).max(80),
  externalDescription: z.string().max(200).optional().nullable(),
  procedureKitId: z.uuid(),
  active: z.boolean(),
});

export type ProcedureMappingInput = z.infer<typeof procedureMappingSchema>;
