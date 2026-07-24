const DATE_FMT = new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  timeZone: 'UTC',
});

/** Long US date, e.g. "January 14, 2026". UTC-based for stable static builds. */
export function formatDate(d: Date): string {
  return DATE_FMT.format(d);
}
