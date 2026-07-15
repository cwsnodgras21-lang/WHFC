import { z } from "zod";

export const feedbackCategories = [
  "bug",
  "feedback",
  "feature",
  "question",
] as const;

export const feedbackFormSchema = z.object({
  category: z.enum(feedbackCategories),
  title: z
    .string()
    .trim()
    .min(3, "Add a short summary.")
    .max(160, "Keep the summary under 160 characters."),
  description: z
    .string()
    .trim()
    .min(10, "Add a little more detail so we can investigate.")
    .max(1_000, "Keep the description under 1,000 characters."),
  pageUrl: z
    .string()
    .trim()
    .max(500)
    .refine((value) => value.startsWith("/"), "Invalid source page."),
  browser: z.object({
    browser: z.string().trim().max(500),
    viewport: z.string().trim().max(50),
    locale: z.string().trim().max(50),
  }),
});

export type FeedbackFormValues = z.infer<typeof feedbackFormSchema>;
