-- =============================================================================
-- WHFC Inventory — reorder suggestions workflow (dismiss / review / PO drafts)
-- =============================================================================

create type public.reorder_suggestion_action as enum (
  'dismissed',
  'reviewed'
);

create type public.purchase_order_draft_status as enum (
  'draft',
  'submitted',
  'cancelled'
);

-- ---------------------------------------------------------------------------
-- Per item+location workflow actions (dismiss 7 days, mark reviewed)
-- ---------------------------------------------------------------------------
create table public.reorder_suggestion_actions (
  id              uuid primary key default gen_random_uuid(),
  item_id         uuid not null references public.items (id) on delete cascade,
  location_id     uuid not null references public.locations (id) on delete cascade,
  action          public.reorder_suggestion_action not null,
  dismissed_until timestamptz,
  created_by      uuid not null references public.profiles (id) on delete restrict,
  created_at      timestamptz not null default now(),
  constraint reorder_suggestion_actions_dismiss_requires_until
    check (
      action is distinct from 'dismissed'
      or dismissed_until is not null
    )
);

create index reorder_suggestion_actions_item_location_idx
  on public.reorder_suggestion_actions (item_id, location_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Purchase order drafts (planning only — does not post inventory)
-- ---------------------------------------------------------------------------
create table public.purchase_order_drafts (
  id          uuid primary key default gen_random_uuid(),
  vendor_id   uuid references public.vendors (id) on delete set null,
  status      public.purchase_order_draft_status not null default 'draft',
  created_by  uuid not null references public.profiles (id) on delete restrict,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger purchase_order_drafts_set_updated_at
  before update on public.purchase_order_drafts
  for each row execute function public.set_updated_at();

create table public.purchase_order_draft_lines (
  id                      uuid primary key default gen_random_uuid(),
  purchase_order_draft_id uuid not null references public.purchase_order_drafts (id) on delete cascade,
  item_id                 uuid not null references public.items (id) on delete restrict,
  location_id             uuid references public.locations (id) on delete set null,
  quantity                numeric not null,
  created_at              timestamptz not null default now(),
  constraint purchase_order_draft_lines_quantity_positive
    check (quantity > 0),
  constraint purchase_order_draft_lines_unique_item
    unique (purchase_order_draft_id, item_id)
);

create index purchase_order_draft_lines_draft_id_idx
  on public.purchase_order_draft_lines (purchase_order_draft_id);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.reorder_suggestion_actions enable row level security;
alter table public.purchase_order_drafts enable row level security;
alter table public.purchase_order_draft_lines enable row level security;

create policy reorder_suggestion_actions_select
  on public.reorder_suggestion_actions for select to authenticated
  using (public.is_active_user());

create policy reorder_suggestion_actions_write
  on public.reorder_suggestion_actions for insert to authenticated
  with check (
    public.current_user_role() in ('administrator', 'inventory_manager')
    and created_by = auth.uid()
  );

create policy purchase_order_drafts_select
  on public.purchase_order_drafts for select to authenticated
  using (public.is_active_user());

create policy purchase_order_drafts_write
  on public.purchase_order_drafts for all to authenticated
  using (public.current_user_role() in ('administrator', 'inventory_manager'))
  with check (public.current_user_role() in ('administrator', 'inventory_manager'));

create policy purchase_order_draft_lines_select
  on public.purchase_order_draft_lines for select to authenticated
  using (public.is_active_user());

create policy purchase_order_draft_lines_write
  on public.purchase_order_draft_lines for all to authenticated
  using (public.current_user_role() in ('administrator', 'inventory_manager'))
  with check (public.current_user_role() in ('administrator', 'inventory_manager'));

grant select, insert on public.reorder_suggestion_actions to authenticated;
grant select, insert, update, delete on public.purchase_order_drafts to authenticated;
grant select, insert, update, delete on public.purchase_order_draft_lines to authenticated;
