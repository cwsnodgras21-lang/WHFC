-- =============================================================================
-- WHFC Inventory — clinic catalog seed
--
-- Real starting catalog for the single White House Family Care clinic, derived
-- from the clinic's supply spreadsheet. Reference data + items only; quantities
-- start at zero. Actual stock and expiration dates are entered through the
-- Receive form (which requires an authenticated profile — not seeded here).
--
-- Per-item `track_expiration` is set here: syringes, needles, medications, lab
-- supplies, tests and dated IV supplies track expiration; office, cleaning,
-- paper and general wound-care supplies do not. Lot-number tracking is left off
-- by default and can be enabled per item by an administrator.
--
-- Idempotent: safe to re-run (on conflict do nothing).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Categories
-- ---------------------------------------------------------------------------
insert into public.categories (id, name, description, active) values
  ('f1000000-0000-4000-8000-000000000001', 'Syringes', 'Syringes by volume.', true),
  ('f1000000-0000-4000-8000-000000000002', 'Needles', 'Hypodermic, filter, IV, and lancet needles.', true),
  ('f1000000-0000-4000-8000-000000000003', 'Medications', 'Injectable medications and IV nutrient blends.', true),
  ('f1000000-0000-4000-8000-000000000004', 'Lab Supplies', 'Blood draw tubes, swabs, and specimen collection kits.', true),
  ('f1000000-0000-4000-8000-000000000005', 'Tests', 'Point-of-care rapid tests and test strips.', true),
  ('f1000000-0000-4000-8000-000000000006', 'IV Supplies', 'IV fluids, flushes, and tubing.', true),
  ('f1000000-0000-4000-8000-000000000007', 'Wound Care & Misc', 'Dressings, gloves, and general clinical consumables.', true),
  ('f1000000-0000-4000-8000-000000000008', 'Cleaning Supplies', 'Disinfectants and sanitation consumables.', true),
  ('f1000000-0000-4000-8000-000000000009', 'Office Supplies', 'General office consumables.', true),
  ('f1000000-0000-4000-8000-000000000010', 'Paper Products', 'Tissues, towels, and toilet tissue.', true)
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Units of measure
-- ---------------------------------------------------------------------------
insert into public.units_of_measure (id, name, abbreviation, active) values
  ('f2000000-0000-4000-8000-000000000001', 'Each', 'EA', true),
  ('f2000000-0000-4000-8000-000000000002', 'Box', 'BX', true),
  ('f2000000-0000-4000-8000-000000000003', 'Case', 'CS', true),
  ('f2000000-0000-4000-8000-000000000004', 'Roll', 'RL', true),
  ('f2000000-0000-4000-8000-000000000005', 'Bottle', 'BT', true),
  ('f2000000-0000-4000-8000-000000000006', 'Pack', 'PK', true),
  ('f2000000-0000-4000-8000-000000000007', 'Vial', 'VL', true)
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Vendors
-- ---------------------------------------------------------------------------
insert into public.vendors (id, name, contact_email, contact_phone, active) values
  ('f3000000-0000-4000-8000-000000000001', 'AEL', null, null, true),
  ('f3000000-0000-4000-8000-000000000002', 'Clinic Supply Co.', null, null, true)
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Location (internal storage — a single clinic, not multiple sites)
-- ---------------------------------------------------------------------------
insert into public.locations (id, location_name, room, cabinet, shelf, bin, active) values
  ('f4000000-0000-4000-8000-000000000001', 'Main Clinic — Supply Room', 'Supply Room', null, null, null, true),
  ('f4000000-0000-4000-8000-000000000002', 'Main Clinic — Exam Room', 'Exam Room', null, null, null, true)
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Demo stocking levels (powers reorder suggestions without flooding the dashboard)
-- ---------------------------------------------------------------------------
update public.items
set reorder_point = 2, par_level = 5
where internal_sku in (
  'MISC-GLOVES-M',
  'MISC-BANDAIDS',
  'MISC-ALCOHOL-PADS',
  'SYR-3ML-WO',
  'NDL-23G-HYPO',
  'TEST-STREP-A',
  'MED-B12'
)
and reorder_point = 0
and par_level = 0;

-- ---------------------------------------------------------------------------
-- Items
--
-- Reference data is bound BY NAME (category / vendor) and BY ABBREVIATION
-- (unit) rather than by fixed UUID, so the seed is robust against a database
-- that already has equivalently-named units/categories (e.g. from an earlier
-- seed) — the item simply reuses whatever row exists.
-- ---------------------------------------------------------------------------
insert into public.items (
  item_name, internal_sku, category_id, unit_of_measure_id,
  preferred_vendor_id, track_expiration
)
select
  v.item_name,
  v.internal_sku,
  c.id,
  u.id,
  ven.id,
  v.track_expiration
from (
  values
    -- item_name, internal_sku, category, unit_abbr, vendor, track_expiration
    ('Syringe 10 ml (without needle)', 'SYR-10ML-WOS', 'Syringes', 'BX', null, true),
    ('Syringe 1 ml (without needle)',  'SYR-1ML-WO',   'Syringes', 'BX', null, true),
    ('Syringe 3 ml (without needle)',  'SYR-3ML-WO',   'Syringes', 'BX', null, true),
    ('Insulin Syringe',                'SYR-INSULIN',  'Syringes', 'BX', null, true),

    ('Needle 18g Hypodermic',   'NDL-18G-HYPO',        'Needles', 'BX', null, true),
    ('Needle 23g Hypodermic',   'NDL-23G-HYPO',        'Needles', 'BX', null, true),
    ('Lancets',                 'NDL-LANCETS',         'Needles', 'BX', null, true),
    ('Blunt Filter Needles',    'NDL-BLUNT-FILTER',    'Needles', 'BX', null, true),
    ('Multi Dose Spikes',       'NDL-MULTIDOSE-SPIKE', 'Needles', 'BX', null, true),
    ('IV Needle 20g',           'NDL-IV-20G',          'Needles', 'BX', null, true),
    ('IV Needle 22g',           'NDL-IV-22G',          'Needles', 'BX', null, true),

    ('Lidocaine 1%',        'MED-LIDOCAINE-1',  'Medications', 'VL', null, true),
    ('Magnesium Chloride',  'MED-MAG-CHLORIDE', 'Medications', 'VL', null, true),
    ('B12',                 'MED-B12',          'Medications', 'VL', null, true),
    ('Vitamin D',           'MED-VITAMIN-D',    'Medications', 'VL', null, true),
    ('Decadron',            'MED-DECADRON',     'Medications', 'VL', null, true),
    ('Kenalog',             'MED-KENALOG',      'Medications', 'VL', null, true),
    ('Toradol',             'MED-TORADOL',      'Medications', 'VL', null, true),
    ('Rocephin',            'MED-ROCEPHIN',     'Medications', 'VL', null, true),
    ('Zofran',              'MED-ZOFRAN',       'Medications', 'VL', null, true),
    ('Promethazine',        'MED-PROMETHAZINE', 'Medications', 'VL', null, true),
    ('Benadryl',            'MED-BENADRYL',     'Medications', 'VL', null, true),
    ('Depo Medrol',         'MED-DEPO-MEDROL',  'Medications', 'VL', null, true),
    ('Cold Spray',          'MED-COLD-SPRAY',   'Medications', 'EA', null, true),
    ('Sterile Water Spray', 'MED-STERILE-WATER','Medications', 'EA', null, true),
    ('Testosterone Cypionate',  'MED-TEST-CYP',  'Medications', 'VL', null, true),
    ('Testosterone Enanthate',  'MED-TEST-ENTH', 'Medications', 'VL', null, true),
    ('Myers Blend',         'MED-MYERS',        'Medications', 'VL', null, true),
    ('Immunity (Tri-Immune)','MED-IMMUNITY',    'Medications', 'VL', null, true),
    ('Amino Blend',         'MED-AMINO',        'Medications', 'VL', null, true),
    ('Lipo (Lipotropic)',   'MED-LIPO',         'Medications', 'VL', null, true),
    ('Vita Complex',        'MED-VITA-COMPLEX', 'Medications', 'VL', null, true),

    ('White Top Tube (PPT Plasma Prep K2E)', 'LAB-WHITE-TOP',      'Lab Supplies', 'EA', 'AEL', true),
    ('Stool Culture (Red)',                  'LAB-STOOL-RED',      'Lab Supplies', 'EA', 'AEL', true),
    ('Stool Culture (Green)',                'LAB-STOOL-GREEN',    'Lab Supplies', 'EA', 'AEL', true),
    ('Grey Top Tube (Na Fluoride/K Oxalate)','LAB-GREY-TOP',       'Lab Supplies', 'EA', 'AEL', true),
    ('Red Top Tube (Serum)',                 'LAB-RED-TOP',        'Lab Supplies', 'EA', 'AEL', true),
    ('Microtainer (Mini Brown Tube)',        'LAB-MICROTAINER',    'Lab Supplies', 'EA', 'AEL', true),
    ('Navy Top Tube (Trace Element, Red)',   'LAB-NAVY-RED',       'Lab Supplies', 'EA', 'AEL', true),
    ('Navy Top Tube (Trace Element, K2 EDTA)','LAB-NAVY-PURPLE',   'Lab Supplies', 'EA', 'AEL', true),
    ('Light Blue Top Tube (Na Citrate)',     'LAB-LIGHTBLUE-TOP',  'Lab Supplies', 'EA', 'AEL', true),
    ('TB Blood Test',                        'LAB-TB-BLOOD',       'Lab Supplies', 'EA', 'AEL', true),
    ('Orange Pack Swabs (Aptima)',           'LAB-ORANGE-SWAB',    'Lab Supplies', 'PK', 'AEL', true),
    ('E-Swab (Aerobic/Anaerobic)',           'LAB-E-SWAB',         'Lab Supplies', 'EA', 'AEL', true),
    ('Yellow Urine Tube (UA Preservative)',  'LAB-YELLOW-URINE',   'Lab Supplies', 'EA', 'AEL', true),
    ('C&S Vac Urine Straw with Tube',        'LAB-CS-URINE-STRAW', 'Lab Supplies', 'EA', 'AEL', true),
    ('Urine Sample Pack (PCR)',              'LAB-URINE-PCR',      'Lab Supplies', 'PK', 'AEL', true),

    ('Strep A Test',             'TEST-STREP-A',    'Tests', 'BX', null, true),
    ('Mono Test',                'TEST-MONO',       'Tests', 'BX', null, true),
    ('Flu A/B / COVID Test',     'TEST-FLU-ABC',    'Tests', 'BX', null, true),
    ('Glucometer Test Strips',   'TEST-GLUCOMETER', 'Tests', 'BX', null, true),
    ('Urine Test Strips',        'TEST-URINE-STRIP','Tests', 'BX', null, true),

    ('IV Fluids — Normal Saline','IV-FLUIDS-NS',    'IV Supplies', 'EA', null, true),
    ('Flushes',                  'IV-FLUSHES',      'IV Supplies', 'BX', null, true),
    ('Drip/GTT Tubing',          'IV-GTT-TUBING',   'IV Supplies', 'EA', null, false),

    ('Coban',                'MISC-COBAN',        'Wound Care & Misc', 'RL', null, false),
    ('Bandaids',             'MISC-BANDAIDS',     'Wound Care & Misc', 'BX', null, false),
    ('Gauze Pads',           'MISC-GAUZE',        'Wound Care & Misc', 'PK', null, false),
    ('Alcohol Prep Pads',    'MISC-ALCOHOL-PADS', 'Wound Care & Misc', 'BX', null, false),
    ('Tegaderm',             'MISC-TEGADERM',     'Wound Care & Misc', 'BX', null, false),
    ('Gloves (Small)',       'MISC-GLOVES-S',     'Wound Care & Misc', 'BX', null, false),
    ('Gloves (Medium)',      'MISC-GLOVES-M',     'Wound Care & Misc', 'BX', null, false),
    ('Gloves (Large)',       'MISC-GLOVES-L',     'Wound Care & Misc', 'BX', null, false),

    ('Hand Sanitizer', 'CLN-HAND-SANITIZER', 'Cleaning Supplies', 'BT', null, false),
    ('Hand Soap',      'CLN-HAND-SOAP',      'Cleaning Supplies', 'BT', null, false),
    ('Lysol Wipes',    'CLN-LYSOL-WIPES',    'Cleaning Supplies', 'EA', null, false),
    ('Lysol Spray',    'CLN-LYSOL-SPRAY',    'Cleaning Supplies', 'EA', null, false),
    ('Trash Bags',     'CLN-TRASH-BAGS',     'Cleaning Supplies', 'BX', null, false),

    ('Batteries',  'OFF-BATTERIES',  'Office Supplies', 'PK', null, false),
    ('Copy Paper', 'OFF-COPY-PAPER', 'Office Supplies', 'CS', null, false),

    ('Tissues',       'PPR-TISSUES',       'Paper Products', 'BX', null, false),
    ('Toilet Tissue', 'PPR-TOILET-TISSUE', 'Paper Products', 'RL', null, false),
    ('Paper Towels',  'PPR-PAPER-TOWELS',  'Paper Products', 'RL', null, false)
) as v(item_name, internal_sku, category_name, unit_abbr, vendor_name, track_expiration)
join public.categories c
  on lower(trim(c.name)) = lower(trim(v.category_name)) and c.active
join public.units_of_measure u
  on lower(trim(u.abbreviation)) = lower(trim(v.unit_abbr)) and u.active
left join public.vendors ven
  on v.vendor_name is not null
  and lower(trim(ven.name)) = lower(trim(v.vendor_name)) and ven.active
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Example procedure kits (matched by item name; skipped when items are missing)
-- ---------------------------------------------------------------------------
insert into public.procedure_kits (id, name, description, active, default_location_id)
values
  (
    'f2000000-0000-4000-8000-000000000001',
    'Testosterone Injection',
    'IM testosterone injection supplies with variable medication amount.',
    true,
    (select id from public.locations where active limit 1)
  ),
  (
    'f2000000-0000-4000-8000-000000000002',
    'B12 Injection',
    'B12 injection with variable draw volume.',
    true,
    (select id from public.locations where active limit 1)
  ),
  (
    'f2000000-0000-4000-8000-000000000003',
    'Strep Test',
    'Rapid strep test kit components.',
    true,
    (select id from public.locations where active limit 1)
  ),
  (
    'f2000000-0000-4000-8000-000000000004',
    'Flu/COVID Test',
    'Combined flu and COVID rapid test.',
    true,
    (select id from public.locations where active limit 1)
  ),
  (
    'f2000000-0000-4000-8000-000000000005',
    'Basic IV Start Kit',
    'Supplies to start a peripheral IV.',
    true,
    (select id from public.locations where active limit 1)
  )
on conflict do nothing;

-- Testosterone Injection components
insert into public.procedure_kit_components (
  procedure_kit_id, item_id, quantity, unit,
  is_variable_quantity, variable_quantity_label, variable_quantity_unit,
  calculation_type, concentration_amount, concentration_unit,
  concentration_volume, concentration_volume_unit, required
)
select
  'f2000000-0000-4000-8000-000000000001',
  i.id, 1, 'mL', true, 'Administered amount', 'mg', 'concentration',
  200, 'mg', 1, 'mL', true
from public.items i
where lower(trim(i.item_name)) = lower('Testosterone Cypionate') and i.active
on conflict do nothing;

insert into public.procedure_kit_components (procedure_kit_id, item_id, quantity, unit, required)
select 'f2000000-0000-4000-8000-000000000001', i.id, 1, 'EA', true
from public.items i
where lower(trim(i.item_name)) = lower('Syringe 3 ml (without needle)') and i.active
on conflict do nothing;

insert into public.procedure_kit_components (procedure_kit_id, item_id, quantity, unit, required)
select 'f2000000-0000-4000-8000-000000000001', i.id, 1, 'EA', true
from public.items i
where lower(trim(i.item_name)) = lower('Needle 23g Hypodermic') and i.active
on conflict do nothing;

insert into public.procedure_kit_components (procedure_kit_id, item_id, quantity, unit, required)
select 'f2000000-0000-4000-8000-000000000001', i.id, 1, 'EA', true
from public.items i
where lower(trim(i.item_name)) = lower('Alcohol Prep Pads') and i.active
on conflict do nothing;

insert into public.procedure_kit_components (procedure_kit_id, item_id, quantity, unit, required)
select 'f2000000-0000-4000-8000-000000000001', i.id, 1, 'EA', true
from public.items i
where lower(trim(i.item_name)) = lower('Bandaids') and i.active
on conflict do nothing;

-- B12 Injection
insert into public.procedure_kit_components (
  procedure_kit_id, item_id, quantity, unit,
  is_variable_quantity, variable_quantity_label, variable_quantity_unit,
  calculation_type, concentration_amount, concentration_unit,
  concentration_volume, concentration_volume_unit, required
)
select
  'f2000000-0000-4000-8000-000000000002',
  i.id, 1, 'mL', true, 'Administered amount', 'mcg', 'concentration',
  1000, 'mcg', 1, 'mL', true
from public.items i
where lower(trim(i.item_name)) = lower('B12') and i.active
on conflict do nothing;

insert into public.procedure_kit_components (procedure_kit_id, item_id, quantity, unit, required)
select 'f2000000-0000-4000-8000-000000000002', i.id, 1, 'EA', true
from public.items i
where lower(trim(i.item_name)) in (
  'syringe 3 ml (without needle)',
  'needle 23g hypodermic',
  'alcohol prep pads',
  'bandaids'
) and i.active
on conflict do nothing;

-- Strep Test
insert into public.procedure_kit_components (procedure_kit_id, item_id, quantity, unit, required)
select 'f2000000-0000-4000-8000-000000000003', i.id, 1, 'EA', true
from public.items i
where lower(trim(i.item_name)) = lower('Strep A Test') and i.active
on conflict do nothing;

-- Flu/COVID Test
insert into public.procedure_kit_components (procedure_kit_id, item_id, quantity, unit, required)
select 'f2000000-0000-4000-8000-000000000004', i.id, 1, 'EA', true
from public.items i
where lower(trim(i.item_name)) = lower('Flu A/B / COVID Test') and i.active
on conflict do nothing;

-- Basic IV Start Kit
insert into public.procedure_kit_components (procedure_kit_id, item_id, quantity, unit, required)
select 'f2000000-0000-4000-8000-000000000005', i.id, 1, 'EA', true
from public.items i
where lower(trim(i.item_name)) in (
  'iv needle 22g',
  'syringe 10 ml (without needle)',
  'alcohol prep pads',
  'tegaderm'
) and i.active
on conflict do nothing;

-- Future EMR mapping example (inactive integration placeholder)
insert into public.procedure_mappings (
  source_system, external_code, external_description, procedure_kit_id, active
)
values (
  'future_emr',
  'TESTOSTERONE_INJ',
  'Testosterone injection procedure',
  'f2000000-0000-4000-8000-000000000001',
  true
)
on conflict do nothing;
