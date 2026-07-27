import "server-only";

import { canManageBilling } from "@/lib/auth/permissions";
import type { AppSession } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";

export type BillingSubscriptionRow = {
  planName: string;
  status: string;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
};

export type BillingPaymentMethodRow = {
  brand: string | null;
  last4: string | null;
  expMonth: number | null;
  expYear: number | null;
};

export type BillingInvoiceRow = {
  id: string;
  createdAt: string;
  amountDue: number;
  amountPaid: number;
  currency: string;
  status: string;
  hostedInvoiceUrl: string | null;
  invoicePdf: string | null;
};

export type BillingPageData = {
  canManage: boolean;
  permissionMessage: string | null;
  hasCustomer: boolean;
  subscription: BillingSubscriptionRow | null;
  paymentMethod: BillingPaymentMethodRow | null;
  invoices: BillingInvoiceRow[];
  loadError: string | null;
};

export async function getBillingPageData(session: AppSession): Promise<BillingPageData> {
  const canManage = canManageBilling(session.profile.role, session.profile.active);

  if (!canManage) {
    return {
      canManage: false,
      permissionMessage: "Only administrators can view and manage billing.",
      hasCustomer: false,
      subscription: null,
      paymentMethod: null,
      invoices: [],
      loadError: null,
    };
  }

  try {
    const supabase = createAdminClient();

    const { data: customer, error: customerError } = await supabase
      .from("billing_customers")
      .select("id")
      .limit(1)
      .maybeSingle();

    if (customerError) {
      throw new Error(customerError.message);
    }

    if (!customer) {
      return {
        canManage: true,
        permissionMessage: null,
        hasCustomer: false,
        subscription: null,
        paymentMethod: null,
        invoices: [],
        loadError: null,
      };
    }

    const [subscriptionResult, paymentMethodResult, invoicesResult] = await Promise.all([
      supabase
        .from("billing_subscriptions")
        .select("plan_name, status, current_period_end, cancel_at_period_end")
        .eq("billing_customer_id", customer.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("billing_payment_methods")
        .select("brand, last4, exp_month, exp_year")
        .eq("billing_customer_id", customer.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("billing_invoices")
        .select(
          "id, created_at, amount_due, amount_paid, currency, status, hosted_invoice_url, invoice_pdf"
        )
        .eq("billing_customer_id", customer.id)
        .order("created_at", { ascending: false })
        .limit(24),
    ]);

    if (subscriptionResult.error) throw new Error(subscriptionResult.error.message);
    if (paymentMethodResult.error) throw new Error(paymentMethodResult.error.message);
    if (invoicesResult.error) throw new Error(invoicesResult.error.message);

    const subscription = subscriptionResult.data;
    const paymentMethod = paymentMethodResult.data;
    const invoices = invoicesResult.data ?? [];

    return {
      canManage: true,
      permissionMessage: null,
      hasCustomer: true,
      subscription: subscription
        ? {
            planName: subscription.plan_name,
            status: subscription.status,
            currentPeriodEnd: subscription.current_period_end,
            cancelAtPeriodEnd: subscription.cancel_at_period_end,
          }
        : null,
      paymentMethod: paymentMethod
        ? {
            brand: paymentMethod.brand,
            last4: paymentMethod.last4,
            expMonth: paymentMethod.exp_month,
            expYear: paymentMethod.exp_year,
          }
        : null,
      invoices: invoices.map((invoice) => ({
        id: invoice.id,
        createdAt: invoice.created_at,
        amountDue: invoice.amount_due,
        amountPaid: invoice.amount_paid,
        currency: invoice.currency,
        status: invoice.status,
        hostedInvoiceUrl: invoice.hosted_invoice_url,
        invoicePdf: invoice.invoice_pdf,
      })),
      loadError: null,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load billing data.";
    return {
      canManage: true,
      permissionMessage: null,
      hasCustomer: false,
      subscription: null,
      paymentMethod: null,
      invoices: [],
      loadError: message,
    };
  }
}
