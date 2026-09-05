/**
 * Cohort/CohortSession dates are calendar-only (@db.Date) — represented
 * consistently at UTC midnight so a date-only column never drifts a day
 * depending on the server's local timezone. Organization.timezone is what
 * governs how these are *displayed*, not how they're stored.
 */
export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}
