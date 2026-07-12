-- Restrict units_of_measure writes to administrators only.
-- Inventory managers may still read units for item forms and reports.

drop policy if exists units_of_measure_write on public.units_of_measure;

create policy units_of_measure_write
  on public.units_of_measure for all to authenticated
  using (public.current_user_role() = 'administrator')
  with check (public.current_user_role() = 'administrator');
