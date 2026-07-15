import { describe, expect, it } from "vitest";

import { feedbackFormSchema } from "@/lib/validation/feedback";

const validFeedback = {
  category: "bug",
  title: "Quantity does not update",
  description: "The quantity remains unchanged after scanning an item.",
  pageUrl: "/receive",
  browser: {
    browser: "Test browser",
    viewport: "1280x720",
    locale: "en-US",
  },
};

describe("feedbackFormSchema", () => {
  it("accepts bounded operational feedback", () => {
    expect(feedbackFormSchema.safeParse(validFeedback).success).toBe(true);
  });

  it("rejects descriptions over 1,000 characters", () => {
    const result = feedbackFormSchema.safeParse({
      ...validFeedback,
      description: "x".repeat(1_001),
    });

    expect(result.success).toBe(false);
  });

  it("rejects external source URLs", () => {
    const result = feedbackFormSchema.safeParse({
      ...validFeedback,
      pageUrl: "https://example.com/receive",
    });

    expect(result.success).toBe(false);
  });

  it("rejects unsupported feedback categories", () => {
    const result = feedbackFormSchema.safeParse({
      ...validFeedback,
      category: "clinical",
    });

    expect(result.success).toBe(false);
  });
});
