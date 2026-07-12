-- =============================================================================
-- WHFC Inventory — Row Level Security policies
-- =============================================================================

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.units_of_measure enable row level security;
alter table public.vendors enable row level security;
alter table public.items enable row level security;
alter table public.locations enable row level security;
alter table public.inventory_transactions enable row level security;
alter table public.physical_counts enable row level security;
alter table public.physical_count_lines enable row level security;
alter table public.audit_log enable row level security;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create policy profiles_select_authenticated
  on public.profiles for select
  to authenticated
  using (public.is_active_user());

create policy profiles_update_self_name
  on public.profiles for update
  to authenticated
  using (id = auth.uid() and public.is_active_user())
  with check (
    id = auth.uid()
    and role = (select p.role from public.profiles p where p.id = auth.uid())
    and active = (select p.active from public.profiles p where p.id = auth.uid())
  );

create policy profiles_admin_update
  on public.profiles for update
  to authenticated
  using (public.current_user_role() = 'administrator')
  with check (public.current_user_role() = 'administrator');

-- ---------------------------------------------------------------------------
-- Reference data — read for all active users; write for manager+
-- ---------------------------------------------------------------------------
create policy categories_select
  on public.categories for select to authenticated
  using (public.is_active_user());

create policy categories_write
  on public.categories for all to authenticated
  using (public.current_user_role() in ('administrator', 'inventory_manager'))
  with check (public.current_user_role() in ('administrator', 'inventory_manager'));

create policy units_of_measure_select
  on public.units_of_measure for select to authenticated
  using (public.is_active_user());

create policy units_of_measure_write
  on public.units_of_measure for all to authenticated
  using (public.current_user_role() in ('administrator', 'inventory_manager'))
  with check (public.current_user_role() in ('administrator', 'inventory_manager'));

create policy vendors_select
  on public.vendors for select to authenticated
  using (public.is_active_user());

create policy vendors_write
  on public.vendors for all to authenticated
  using (public.current_user_role() in ('administrator', 'inventory_manager'))
  with check (public.current_user_role() in ('administrator', 'inventory_manager'));

create policy items_select
  on public.items for select to authenticated
  using (public.is_active_user());

create policy items_write
  on public.items for all to authenticated
  using (public.current_user_role() in ('administrator', 'inventory_manager'))
  with check (public.current_user_role() in ('administrator', 'inventory_manager'));

create policy locations_select
  on public.locations for select to authenticated
  using (public.is_active_user());

create policy locations_write
  on public.locations for all to authenticated
  using (public.current_user_role() in ('administrator', 'inventory_manager'))
  with check (public.current_user_role() in ('administrator', 'inventory_manager'));

-- ---------------------------------------------------------------------------
-- inventory_transactions — SELECT only; writes via RPC
-- ---------------------------------------------------------------------------
create policy inventory_transactions_select_elevated
  on public.inventory_transactions for select to authenticated
  using (
    public.is_active_user()
    and public.current_user_role() in (
      'administrator', 'inventory_manager', 'read_only'
    )
  );

create policy inventory_transactions_select_staff_own
  on public.inventory_transactions for select to authenticated
  using (
    public.is_active_user()
    and public.current_user_role() = 'staff'
    and performed_by = auth.uid()
  );

-- ---------------------------------------------------------------------------
-- physical counts
-- ---------------------------------------------------------------------------
create policy physical_counts_select
  on public.physical_counts for select to authenticated
  using (public.is_active_user());

create policy physical_counts_write_manager
  on public.physical_counts for all to authenticated
  using (public.current_user_role() in ('administrator', 'inventory_manager'))
  with check (public.current_user_role() in ('administrator', 'inventory_manager'));

create policy physical_count_lines_select
  on public.physical_count_lines for select to authenticated
  using (
    public.is_active_user()
    and exists (
      select 1 from public.physical_counts pc
      where pc.id = physical_count_id
    )
  );

create policy physical_count_lines_write_manager
  on public.physical_count_lines for all to authenticated
  using (public.current_user_role() in ('administrator', 'inventory_manager'))
  with check (public.current_user_role() in ('administrator', 'inventory_manager'));

-- ---------------------------------------------------------------------------
-- audit_log — read for manager+; inserts via triggers only
-- ---------------------------------------------------------------------------
create policy audit_log_select_manager
  on public.audit_log for select to authenticated
  using (
    public.current_user_role() in ('administrator', 'inventory_manager')
  );
