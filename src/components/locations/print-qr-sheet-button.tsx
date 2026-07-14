"use client";

import { Button } from "@/components/ui/button";

export function PrintQrSheetButton() {
  return (
    <Button type="button" variant="primary" onClick={() => window.print()}>
      Print QR codes
    </Button>
  );
}
