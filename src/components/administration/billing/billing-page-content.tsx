"use client";

import { useState, useTransition } from "react";
import { CreditCard, ExternalLink, FileText } from "lucide-react";

import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, DataTableShell } from "@/components/ui/data-table";
import { ErrorState } from "@/components/ui/error-state";
import { PageHeader } from "@/components/ui/page-header";
import { formatDate } from "@/lib/format/inventory";
import type { BillingPageData } from "@/lib/data/billing-page";

type BillingPageContentProps = {
  data: BillingPageData;
};

type BadgeVariant = "default" | "info" | "warning" | "caution" | "success" | "danger";

const STATUS_BADGE_VARIANT: Record<string, BadgeVariant> = {
  active: "success",
  trialing: "info",
  past_due: "warning",
  incomplete: "warning",
  canceled: "danger",
  unpaid: "danger",
};

function subscriptionStatusVariant(status: string): BadgeVariant {
  return STATUS_BADGE_VARIANT[status] ?? "default";
}

function invoiceStatusVariant(status: string): BadgeVariant {
  if (status === "paid") return "success";
  if (status === "open") return "warning";
  if (status === "uncollectible" || status === "void") return "danger";
  return "default";
}

function formatAmount(cents: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

function formatCardBrand(brand: string | null): string {
  if (!brand) return "Card";
  return brand.charAt(0).toUpperCase() + brand.slice(1);
}

const DEFAULT_PRICE_ID = process.env.NEXT_PUBLIC_STRIPE_PRICE_ID;

export function BillingPageContent({ data }: BillingPageContentProps) {
  const [isPending, startTransition] = useTransition();
  const [actionError, setActionError] = useState<string | null>(null);

  if (!data.canManage) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Billing"
          description="Manage the subscription and payment method for this app."
        />
        <ErrorState
          title="Access denied"
          message={data.permissionMessage ?? "Only administrators can view and manage billing."}
        />
      </div>
    );
  }

  function openPortal() {
    setActionError(null);
    startTransition(async () => {
      try {
        const response = await fetch("/api/stripe/portal", { method: "POST" });
        const result = (await response.json()) as { url?: string; error?: string };

        if (!response.ok || !result.url) {
          setActionError(result.error ?? "Could not open the billing portal.");
          return;
        }

        window.location.href = result.url;
      } catch {
        setActionError("Could not open the billing portal.");
      }
    });
  }

  function startCheckout() {
    if (!DEFAULT_PRICE_ID) {
      setActionError(
        "Set NEXT_PUBLIC_STRIPE_PRICE_ID to enable checkout for this app."
      );
      return;
    }

    setActionError(null);
    startTransition(async () => {
      try {
        const response = await fetch("/api/stripe/create-checkout", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            mode: "subscription",
            priceId: DEFAULT_PRICE_ID,
            successUrl: `${window.location.origin}/administration/billing?checkout=success`,
            cancelUrl: `${window.location.origin}/administration/billing?checkout=cancelled`,
          }),
        });
        const result = (await response.json()) as { url?: string; error?: string };

        if (!response.ok || !result.url) {
          setActionError(result.error ?? "Could not start checkout.");
          return;
        }

        window.location.href = result.url;
      } catch {
        setActionError("Could not start checkout.");
      }
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Billing"
        description="Manage the subscription and payment method for this app."
        actions={
          data.subscription ? (
            <Button type="button" disabled={isPending} onClick={openPortal}>
              {isPending ? "Opening..." : "Manage billing"}
            </Button>
          ) : (
            <Button type="button" disabled={isPending} onClick={startCheckout}>
              {isPending ? "Starting..." : "Set up billing"}
            </Button>
          )
        }
      />

      {data.loadError ? (
        <ErrorState title="Some billing data could not be loaded" message={data.loadError} />
      ) : null}

      {actionError ? <Alert variant="error" message={actionError} /> : null}

      {!data.hasCustomer && !data.loadError ? (
        <div className="card card-body">
          <h2 className="section-heading">No billing set up yet</h2>
          <p className="mt-1 text-sm text-[var(--color-fg-muted)]">
            Set up billing to start a subscription and add a payment method.
          </p>
        </div>
      ) : null}

      {data.hasCustomer ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="card card-body space-y-3">
            <h2 className="section-heading">Subscription</h2>
            {data.subscription ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-[var(--color-fg)]">
                    {data.subscription.planName}
                  </span>
                  <Badge variant={subscriptionStatusVariant(data.subscription.status)}>
                    {data.subscription.status.replace(/_/g, " ")}
                  </Badge>
                  {data.subscription.cancelAtPeriodEnd ? (
                    <Badge variant="warning">Cancels at period end</Badge>
                  ) : null}
                </div>
                <p className="text-sm text-[var(--color-fg-muted)]">
                  Next billing date: {formatDate(data.subscription.currentPeriodEnd)}
                </p>
              </div>
            ) : (
              <p className="text-sm text-[var(--color-fg-muted)]">No active subscription.</p>
            )}
          </div>

          <div className="card card-body space-y-3">
            <h2 className="section-heading">Payment method</h2>
            {data.paymentMethod ? (
              <div className="flex items-center gap-3">
                <CreditCard className="h-5 w-5 text-[var(--color-fg-muted)]" aria-hidden />
                <div>
                  <p className="font-medium text-[var(--color-fg)]">
                    {formatCardBrand(data.paymentMethod.brand)} ····{" "}
                    {data.paymentMethod.last4 ?? "----"}
                  </p>
                  <p className="text-sm text-[var(--color-fg-muted)]">
                    {data.paymentMethod.expMonth && data.paymentMethod.expYear
                      ? `Expires ${data.paymentMethod.expMonth}/${data.paymentMethod.expYear}`
                      : "No expiration on file"}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-[var(--color-fg-muted)]">
                No payment method on file.
              </p>
            )}
          </div>
        </div>
      ) : null}

      {data.hasCustomer ? (
        <div className="space-y-3">
          <h2 className="section-heading">Invoice history</h2>
          {data.invoices.length > 0 ? (
            <DataTableShell>
              <DataTable>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {data.invoices.map((invoice) => {
                    const link = invoice.hostedInvoiceUrl ?? invoice.invoicePdf;
                    return (
                      <tr key={invoice.id}>
                        <td className="whitespace-nowrap">{formatDate(invoice.createdAt)}</td>
                        <td>{formatAmount(invoice.amountPaid || invoice.amountDue, invoice.currency)}</td>
                        <td>
                          <Badge variant={invoiceStatusVariant(invoice.status)}>
                            {invoice.status}
                          </Badge>
                        </td>
                        <td className="text-right">
                          {link ? (
                            <a
                              href={link}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-sm font-medium text-[var(--color-primary)]"
                            >
                              <FileText className="h-4 w-4" aria-hidden />
                              PDF
                              <ExternalLink className="h-3 w-3" aria-hidden />
                            </a>
                          ) : (
                            "—"
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </DataTable>
            </DataTableShell>
          ) : (
            <p className="text-sm text-[var(--color-fg-muted)]">No invoices yet.</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
