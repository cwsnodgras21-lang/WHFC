-- =============================================================================
-- WHFC Inventory — core tables
-- =============================================================================

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text,
  role        public.user_role not null default 'read_only',
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Reference data
-- ---------------------------------------------------------------------------
create table public.categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint categories_name_not_blank check (char_length(trim(name)) > 0)
);

create unique index categories_name_active_unique
  on public.categories (lower(trim(name)))
  where active = true;

create trigger categories_set_updated_at
  before update on public.categories
  for each row execute function public.set_updated_at();

create table public.units_of_measure (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  abbreviation  text not null,
  active        boolean not null default true,
  constraint units_of_measure_name_not_blank check (char_length(trim(name)) > 0),
  constraint units_of_measure_abbrev_not_blank check (char_length(trim(abbreviation)) > 0)
);

create unique index units_of_measure_name_active_unique
  on public.units_of_measure (lower(trim(name)))
  where active = true;

create unique index units_of_measure_abbrev_active_unique
  on public.units_of_measure (lower(trim(abbreviation)))
  where active = true;

create table public.vendors (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  contact_email  text,
  contact_phone  text,
  active         boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint vendors_name_not_blank check (char_length(trim(name)) > 0)
);

create unique index vendors_name_active_unique
  on public.vendors (lower(trim(name)))
  where active = true;

create trigger vendors_set_updated_at
  before update on public.vendors
  for each row execute function public.set_updated_at();

create table public.items (
  id                   uuid primary key default gen_random_uuid(),
  item_name            text not null,
  internal_sku         text not null,
  category_id          uuid not null references public.categories (id),
  unit_of_measure_id   uuid not null references public.units_of_measure (id),
  preferred_vendor_id  uuid references public.vendors (id) on delete set null,
  reorder_point        numeric(12, 3) not null default 0,
  par_level            numeric(12, 3) not null default 0,
  active               boolean not null default true,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  constraint items_name_not_blank check (char_length(trim(item_name)) > 0),
  constraint items_sku_not_blank check (char_length(trim(internal_sku)) > 0),
  constraint items_reorder_point_non_negative check (reorder_point >= 0),
  constraint items_par_level_non_negative check (par_level >= 0)
);

create unique index items_internal_sku_unique on public.items (lower(trim(internal_sku)));
create index items_category_id_idx on public.items (category_id);
create index items_active_idx on public.items (active) where active = true;

create trigger items_set_updated_at
  before update on public.items
  for each row execute function public.set_updated_at();

create table public.locations (
  id            uuid primary key default gen_random_uuid(),
  location_name text not null,
  room          text,
  cabinet       text,
  shelf         text,
  bin           text,
  active        boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint locations_name_not_blank check (char_length(trim(location_name)) > 0)
);

create unique index locations_name_active_unique
  on public.locations (lower(trim(location_name)))
  where active = true;

create trigger locations_set_updated_at
  before update on public.locations
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Inventory ledger (append-only)
-- ---------------------------------------------------------------------------
create table public.inventory_transactions (
  id                     uuid primary key default gen_random_uuid(),
  item_id                uuid not null references public.items (id),
  location_id            uuid not null references public.locations (id),
  transaction_type       public.transaction_type not null,
  quantity               numeric(12, 3) not null,
  transaction_date       timestamptz not null default now(),
  reason_code            public.reason_code not null,
  performed_by           uuid not null references public.profiles (id),
  related_transaction_id uuid references public.inventory_transactions (id),
  created_at             timestamptz not null default now(),
  constraint inventory_transactions_quantity_positive check (quantity > 0)
);

create index inventory_transactions_item_location_date_idx
  on public.inventory_transactions (item_id, location_id, transaction_date desc);

create index inventory_transactions_performed_by_created_idx
  on public.inventory_transactions (performed_by, created_at desc);

create index inventory_transactions_location_created_idx
  on public.inventory_transactions (location_id, created_at desc);

create trigger inventory_transactions_prevent_update
  before update on public.inventory_transactions
  for each row execute function public.prevent_inventory_ledger_mutation();

create trigger inventory_transactions_prevent_delete
  before delete on public.inventory_transactions
  for each row execute function public.prevent_inventory_ledger_mutation();

-- ---------------------------------------------------------------------------
-- Physical counts
-- ---------------------------------------------------------------------------
create table public.physical_counts (
  id           uuid primary key default gen_random_uuid(),
  location_id  uuid not null references public.locations (id),
  status       public.physical_count_status not null default 'in_progress',
  started_at   timestamptz not null default now(),
  completed_at timestamptz,
  created_by   uuid not null references public.profiles (id),
  completed_by uuid references public.profiles (id),
  constraint physical_counts_completed_requires_timestamp check (
    status <> 'completed' or completed_at is not null
  )
);

create index physical_counts_location_status_idx
  on public.physical_counts (location_id, status);

create table public.physical_count_lines (
  id                uuid primary key default gen_random_uuid(),
  physical_count_id uuid not null references public.physical_counts (id) on delete cascade,
  item_id           uuid not null references public.items (id),
  system_quantity   numeric(12, 3) not null default 0,
  counted_quantity  numeric(12, 3) not null default 0,
  variance          numeric(12, 3) generated always as (counted_quantity - system_quantity) stored,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint physical_count_lines_quantities_non_negative check (
    system_quantity >= 0 and counted_quantity >= 0
  ),
  constraint physical_count_lines_unique_item unique (physical_count_id, item_id)
);

create trigger physical_count_lines_set_updated_at
  before update on public.physical_count_lines
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Master-data / administration audit (not inventory movements)
-- ---------------------------------------------------------------------------
create table public.audit_log (
  id           uuid primary key default gen_random_uuid(),
  actor_id     uuid references public.profiles (id) on delete set null,
  action       text not null,
  entity_type  text not null,
  entity_id    uuid not null,
  before_state jsonb,
  after_state  jsonb,
  created_at   timestamptz not null default now(),
  constraint audit_log_action_not_blank check (char_length(trim(action)) > 0),
  constraint audit_log_entity_type_not_blank check (char_length(trim(entity_type)) > 0)
);

create index audit_log_entity_created_idx
  on public.audit_log (entity_type, entity_id, created_at desc);

create index audit_log_actor_created_idx
  on public.audit_log (actor_id, created_at desc);
