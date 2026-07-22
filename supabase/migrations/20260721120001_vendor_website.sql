-- =============================================================================
-- WHFC Inventory — vendor website field (for online ordering)
-- =============================================================================

alter table public.vendors
  add column if not exists website text;

alter table public.vendors
  drop constraint if exists vendors_website_length;

alter table public.vendors
  add constraint vendors_website_length
    check (website is null or char_length(website) <= 2048);
