"use client";

import { Button } from "@/components/ui/button";

export function PrintReorderReportButton() {
  return (
    <Button type="button" variant="secondary" onClick={() => window.print()}>
      Print report
    </Button>
  );
}
