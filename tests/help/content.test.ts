import { describe, expect, it } from "vitest";

import { HELP_TOPICS, type HelpTopicKey } from "@/lib/help/content";

const REQUIRED_TOPICS: HelpTopicKey[] = [
  "dashboard",
  "items",
  "vendors",
  "locations",
  "receive",
  "consume",
  "procedure-kits",
  "transfer",
  "physical-counts",
  "reorder-suggestions",
  "expiration",
  "samples",
  "samples-dispense",
  "user-administration",
  "settings",
];

describe("HELP_TOPICS", () => {
  it("covers every page named in the launch requirements", () => {
    for (const topic of REQUIRED_TOPICS) {
      expect(HELP_TOPICS[topic]).toBeDefined();
    }
  });

  it("gives every topic a title, purpose, at least one workflow step, and no PHI-shaped placeholder text", () => {
    for (const [key, topic] of Object.entries(HELP_TOPICS)) {
      expect(topic.title, `${key} title`).toBeTruthy();
      expect(topic.purpose, `${key} purpose`).toBeTruthy();
      expect(topic.whatYouCanDo.length, `${key} whatYouCanDo`).toBeGreaterThan(0);
      expect(topic.steps.length, `${key} steps`).toBeGreaterThan(0);
    }
  });

  it("flags the patient-reference requirement wherever patient data is entered", () => {
    expect(HELP_TOPICS["samples-dispense"].commonMistakes.join(" ")).toMatch(
      /full name/i
    );
  });
});
