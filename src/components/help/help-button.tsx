"use client";

import { useState } from "react";
import { HelpCircle } from "lucide-react";

import type { HelpTopicKey } from "@/lib/help/content";
import { Button } from "@/components/ui/button";
import { HelpDialog } from "@/components/help/help-dialog";

type HelpButtonProps = {
  topic: HelpTopicKey;
};

/** Reusable "?" trigger for a page's contextual help. Place near the page heading. */
export function HelpButton({ topic }: HelpButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        aria-label="Help for this page"
        onClick={() => setOpen(true)}
      >
        <HelpCircle className="h-4 w-4" aria-hidden />
        <span className="hidden sm:inline">Help</span>
      </Button>
      {open ? <HelpDialog topic={topic} onClose={() => setOpen(false)} /> : null}
    </>
  );
}
