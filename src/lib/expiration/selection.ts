/**
 * Pure helpers for bulk lot selection / result summaries.
 * Kept free of React and Supabase so vitest can cover them tightly.
 */

export function toggleLotSelection(
  selected: ReadonlySet<string>,
  lotId: string
): Set<string> {
  const next = new Set(selected);
  if (next.has(lotId)) {
    next.delete(lotId);
  } else {
    next.add(lotId);
  }
  return next;
}

export function selectAllLotIds(lotIds: readonly string[]): Set<string> {
  return new Set(lotIds);
}

export function clearLotSelection(): Set<string> {
  return new Set();
}

export function areAllLotsSelected(
  selected: ReadonlySet<string>,
  lotIds: readonly string[]
): boolean {
  return lotIds.length > 0 && lotIds.every((id) => selected.has(id));
}

export type BulkResultSummary = {
  succeeded: number;
  failed: number;
  errors: { lotId: string; error: string }[];
};

export function summarizeBulkResult(summary: BulkResultSummary): string {
  const { succeeded, failed } = summary;
  if (failed === 0) {
    return succeeded === 1
      ? "Updated 1 lot."
      : `Updated ${succeeded} lots.`;
  }
  if (succeeded === 0) {
    return failed === 1
      ? "Could not update the selected lot."
      : `Could not update ${failed} lots.`;
  }
  return `Updated ${succeeded} lot${succeeded === 1 ? "" : "s"}; ${failed} failed.`;
}
