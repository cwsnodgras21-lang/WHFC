-- =============================================================================
-- WHFC Inventory — PO draft review workflow (approve / order / line metadata)
-- =============================================================================

alter type public.purchase_order_draft_status add value if not exists 'approved';
alter type public.purchase_order_draft_status add value if not exists 'ordered';

-- The data migration that converts legacy 'submitted' drafts to 'approved'
-- lives in a separate migration (20260708120007). Postgres forbids using a
-- newly added enum value in the same transaction that adds it.

alter table public.purchase_order_draft_lines
  add column if not exists suggested_quantity numeric,
  add column if not exists reorder_reason text,
  add column if not exists notes text;

alter table public.purchase_order_draft_lines
  drop constraint if exists purchase_order_draft_lines_notes_length;

alter table public.purchase_order_draft_lines
  add constraint purchase_order_draft_lines_notes_length
    check (notes is null or char_length(notes) <= 500);

alter table public.purchase_order_draft_lines
  drop constraint if exists purchase_order_draft_lines_reorder_reason_length;

alter table public.purchase_order_draft_lines
  add constraint purchase_order_draft_lines_reorder_reason_length
    check (reorder_reason is null or char_length(reorder_reason) <= 200);

update public.purchase_order_draft_lines
set suggested_quantity = quantity
where suggested_quantity is null;
