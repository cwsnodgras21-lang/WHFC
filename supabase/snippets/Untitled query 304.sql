select routine_schema, routine_name
from information_schema.routines
where routine_schema = 'inventory_ops'
  and routine_name = 'assert_location_not_under_count';