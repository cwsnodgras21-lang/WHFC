export type ActiveStatusFilter = "all" | "active" | "inactive";

/** Parse `?status=` for catalog filters (items, locations, etc.). */
export function parseActiveStatusFilter(
  value: string | string[] | undefined
): ActiveStatusFilter {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw === "active" || raw === "inactive") {
    return raw;
  }
  return "all";
}
