export type ReferenceRow = {
  id: string;
  active: boolean;
};

export type SelectOption = {
  id: string;
  label: string;
  active: boolean;
};

/** Active rows plus the currently selected row when it is inactive (for edit forms). */
export function buildFormSelectOptions<T extends ReferenceRow>(
  rows: T[],
  selectedId: string | null | undefined,
  toLabel: (row: T) => string
): SelectOption[] {
  const selected =
    selectedId && !rows.some((row) => row.id === selectedId && row.active)
      ? rows.find((row) => row.id === selectedId)
      : null;

  const activeRows = rows.filter((row) => row.active);

  const options = activeRows.map((row) => ({
    id: row.id,
    label: toLabel(row),
    active: true,
  }));

  if (selected && !selected.active) {
    options.push({
      id: selected.id,
      label: `${toLabel(selected)} (inactive)`,
      active: false,
    });
  }

  return options.sort((a, b) => a.label.localeCompare(b.label));
}
