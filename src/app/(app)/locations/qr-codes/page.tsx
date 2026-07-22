import Link from "next/link";
import { headers } from "next/headers";
import QRCode from "qrcode";

import { PrintQrSheetButton } from "@/components/locations/print-qr-sheet-button";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { PageHeader } from "@/components/ui/page-header";
import { canManageLocations } from "@/lib/auth/permissions";
import { requireSession } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

async function resolveBaseUrl(): Promise<string> {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) {
    return configured.replace(/\/+$/, "");
  }
  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host");
  const proto = headerList.get("x-forwarded-proto") ?? "https";
  return `${proto}://${host}`;
}

export default async function LocationQrCodesPage() {
  const session = await requireSession();
  const supabase = await createClient();

  const canManage = canManageLocations(
    session.profile.role,
    session.profile.active
  );

  if (!canManage) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Location QR codes"
          description="Print a QR code for each storage location."
        />
        <EmptyState
          title="Permission denied"
          description="Only administrators and inventory managers can print location QR codes."
        />
      </div>
    );
  }

  const { data: locations, error } = await supabase
    .from("locations")
    .select("id, location_name")
    .eq("active", true)
    .order("location_name");

  const baseUrl = await resolveBaseUrl();

  const cards = await Promise.all(
    (locations ?? []).map(async (location) => ({
      ...location,
      svg: await QRCode.toString(`${baseUrl}/locations/${location.id}`, {
        type: "svg",
        margin: 1,
        errorCorrectionLevel: "M",
      }),
    }))
  );

  return (
    <div className="space-y-6">
      <div className="qr-sheet-no-print">
        <PageHeader
          title="Location QR codes"
          description="Print this sheet, cut out each code, and post it in the room it belongs to. Scanning a code opens that location's stock list."
          actions={
            <>
              <Link href="/locations" className="link-subtle">
                ← All locations
              </Link>
              <PrintQrSheetButton />
            </>
          }
        />
      </div>

      {error ? (
        <ErrorState title="Could not load locations" message={error.message} />
      ) : cards.length === 0 ? (
        <EmptyState
          title="No active locations"
          description="Add a storage location first, then come back to print its QR code."
        />
      ) : (
        <div className="qr-sheet-grid">
          {cards.map((card) => (
            <div key={card.id} className="qr-sheet-card">
              <div
                className="qr-sheet-code"
                // Trusted markup: SVG generated server-side by the qrcode
                // library from our own location URL.
                dangerouslySetInnerHTML={{ __html: card.svg }}
              />
              <div className="qr-sheet-label">
                <p className="qr-sheet-name">{card.location_name}</p>
                <p className="qr-sheet-hint">Scan to view &amp; count stock</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
