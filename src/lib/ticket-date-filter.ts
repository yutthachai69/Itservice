// Dashboard drill-downs carry exact timestamps so list and export share the same cutoff.
export function ticketDateFilter(value: string | null | undefined): string {
  if (!value || !/^\d{4}-\d{2}-\d{2}T/.test(value)) return "";
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : "";
}
