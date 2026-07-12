"use client";

import { Button } from "@/components/ui/button";

export function PrintPoDraftButton() {
  return (
    <Button type="button" variant="secondary" onClick={() => window.print()}>
      Print draft
    </Button>
  );
}
