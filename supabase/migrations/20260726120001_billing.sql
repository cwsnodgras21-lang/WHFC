-- ============================================================
-- Stripe Billing Module
-- Reusable across all NolTurn customer apps.
-- One Stripe account (NolTurn) · many tenants (one DB each).
-- ============================================================

-- ── billing_customers ───────────────────────────────────────
-- One row per app instance. Stores the Stripe customer ID.
CREATE TABLE IF NOT EXISTS billing_customers (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_customer_id text UNIQUE NOT NULL,
  email             text,
  name              text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- ── billing_subscriptions ───────────────────────────────────
CREATE TABLE IF NOT EXISTS billing_subscriptions (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  billing_customer_id   uuid NOT NULL REFERENCES billing_customers(id) ON DELETE CASCADE,
  stripe_subscription_id text UNIQUE NOT NULL,
  stripe_price_id       text NOT NULL,
  plan_name             text NOT NULL,
  status                text NOT NULL,          -- active | past_due | canceled | trialing | unpaid
  current_period_start  timestamptz,
  current_period_end    timestamptz,
  cancel_at_period_end  boolean NOT NULL DEFAULT false,
  canceled_at           timestamptz,
  trial_end             timestamptz,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

-- ── billing_invoices ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS billing_invoices (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  billing_customer_id   uuid NOT NULL REFERENCES billing_customers(id) ON DELETE CASCADE,
  stripe_invoice_id     text UNIQUE NOT NULL,
  stripe_payment_intent_id text,
  amount_due            integer NOT NULL,        -- cents
  amount_paid           integer NOT NULL DEFAULT 0,
  currency              text NOT NULL DEFAULT 'usd',
  status                text NOT NULL,           -- draft | open | paid | void | uncollectible
  description           text,
  invoice_pdf           text,
  hosted_invoice_url    text,
  due_date              timestamptz,
  paid_at               timestamptz,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

-- ── billing_payment_methods ─────────────────────────────────
CREATE TABLE IF NOT EXISTS billing_payment_methods (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  billing_customer_id       uuid NOT NULL REFERENCES billing_customers(id) ON DELETE CASCADE,
  stripe_payment_method_id  text UNIQUE NOT NULL,
  type                      text NOT NULL,        -- card | us_bank_account | etc.
  brand                     text,                 -- visa | mastercard | etc.
  last4                     text,
  exp_month                 integer,
  exp_year                  integer,
  is_default                boolean NOT NULL DEFAULT false,
  created_at                timestamptz NOT NULL DEFAULT now()
);

-- ── indexes ─────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS billing_subscriptions_customer_idx
  ON billing_subscriptions(billing_customer_id);

CREATE INDEX IF NOT EXISTS billing_invoices_customer_idx
  ON billing_invoices(billing_customer_id);

CREATE INDEX IF NOT EXISTS billing_invoices_status_idx
  ON billing_invoices(status);

CREATE INDEX IF NOT EXISTS billing_payment_methods_customer_idx
  ON billing_payment_methods(billing_customer_id);

-- ── updated_at triggers ─────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'billing_customers_updated_at'
  ) THEN
    CREATE TRIGGER billing_customers_updated_at
      BEFORE UPDATE ON billing_customers
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'billing_subscriptions_updated_at'
  ) THEN
    CREATE TRIGGER billing_subscriptions_updated_at
      BEFORE UPDATE ON billing_subscriptions
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'billing_invoices_updated_at'
  ) THEN
    CREATE TRIGGER billing_invoices_updated_at
      BEFORE UPDATE ON billing_invoices
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;

-- ── RLS ─────────────────────────────────────────────────────
-- Billing tables are admin-only. RLS prevents direct client reads.
ALTER TABLE billing_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_payment_methods ENABLE ROW LEVEL SECURITY;

-- Only service role (server-side) can read/write billing tables.
-- No authenticated user policies → all access goes through server actions.
