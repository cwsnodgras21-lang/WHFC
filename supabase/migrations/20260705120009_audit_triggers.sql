-- =============================================================================
-- WHFC Inventory — master-data audit triggers
-- Inventory movements are NOT duplicated into audit_log.
-- =============================================================================

create or replace function public.audit_items_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    perform inventory_ops.write_audit_log(
      auth.uid(),
      'item.created',
      'item',
      new.id,
      null,
      to_jsonb(new)
    );
    return new;
  elsif tg_op = 'UPDATE' then
    perform inventory_ops.write_audit_log(
      auth.uid(),
      'item.updated',
      'item',
      new.id,
      to_jsonb(old),
      to_jsonb(new)
    );
    return new;
  end if;
  return null;
end;
$$;

create trigger items_audit
  after insert or update on public.items
  for each row execute function public.audit_items_change();

create or replace function public.audit_locations_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    perform inventory_ops.write_audit_log(
      auth.uid(), 'location.created', 'location', new.id, null, to_jsonb(new)
    );
    return new;
  elsif tg_op = 'UPDATE' then
    perform inventory_ops.write_audit_log(
      auth.uid(), 'location.updated', 'location', new.id, to_jsonb(old), to_jsonb(new)
    );
    return new;
  end if;
  return null;
end;
$$;

create trigger locations_audit
  after insert or update on public.locations
  for each row execute function public.audit_locations_change();

create or replace function public.audit_categories_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    perform inventory_ops.write_audit_log(
      auth.uid(), 'category.created', 'category', new.id, null, to_jsonb(new)
    );
    return new;
  elsif tg_op = 'UPDATE' then
    perform inventory_ops.write_audit_log(
      auth.uid(), 'category.updated', 'category', new.id, to_jsonb(old), to_jsonb(new)
    );
    return new;
  end if;
  return null;
end;
$$;

create trigger categories_audit
  after insert or update on public.categories
  for each row execute function public.audit_categories_change();

create or replace function public.audit_units_of_measure_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    perform inventory_ops.write_audit_log(
      auth.uid(), 'unit_of_measure.created', 'unit_of_measure', new.id, null, to_jsonb(new)
    );
    return new;
  elsif tg_op = 'UPDATE' then
    perform inventory_ops.write_audit_log(
      auth.uid(),
      'unit_of_measure.updated',
      'unit_of_measure',
      new.id,
      to_jsonb(old),
      to_jsonb(new)
    );
    return new;
  end if;
  return null;
end;
$$;

create trigger units_of_measure_audit
  after insert or update on public.units_of_measure
  for each row execute function public.audit_units_of_measure_change();

create or replace function public.audit_vendors_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    perform inventory_ops.write_audit_log(
      auth.uid(), 'vendor.created', 'vendor', new.id, null, to_jsonb(new)
    );
    return new;
  elsif tg_op = 'UPDATE' then
    perform inventory_ops.write_audit_log(
      auth.uid(), 'vendor.updated', 'vendor', new.id, to_jsonb(old), to_jsonb(new)
    );
    return new;
  end if;
  return null;
end;
$$;

create trigger vendors_audit
  after insert or update on public.vendors
  for each row execute function public.audit_vendors_change();

create or replace function public.audit_profiles_admin_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and (
    old.role is distinct from new.role
    or old.active is distinct from new.active
  ) then
    perform inventory_ops.write_audit_log(
      auth.uid(),
      case
        when old.role is distinct from new.role then 'profile.role_changed'
        else 'profile.active_changed'
      end,
      'profile',
      new.id,
      jsonb_build_object('role', old.role, 'active', old.active),
      jsonb_build_object('role', new.role, 'active', new.active)
    );
  end if;
  return new;
end;
$$;

create trigger profiles_admin_audit
  after update on public.profiles
  for each row execute function public.audit_profiles_admin_change();
