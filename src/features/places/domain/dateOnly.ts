/**
 * The two halves of the `date` column boundary. A visit is a calendar day, not
 * an instant with a zone, and these are the only two functions allowed to cross
 * between the two representations.
 *
 * Pure, and deliberately not in `data/`: the form needs the same conversion to
 * fill an `<input type="date">`, and a second copy of it there would be the
 * beginning of two subtly different answers.
 */

/**
 * A `YYYY-MM-DD` string, parsed at LOCAL midnight.
 *
 * `new Date('2026-08-20')` is parsed as UTC by spec, so west of Greenwich it
 * formats back as the 19th. The day has to render as the day it was.
 */
export function parseDateOnly(value: string): Date {
  const [year, month, day] = value.split('-').map(Number)
  if (year === undefined || month === undefined || day === undefined) {
    // Not the shape we expect — let Date do what it can rather than throwing
    // away a row over a format surprise.
    return new Date(value)
  }
  return new Date(year, month - 1, day)
}

export function parseNullableDateOnly(value: string | null): Date | null {
  return value === null ? null : parseDateOnly(value)
}

/**
 * The mirror image: a `Date` back to `YYYY-MM-DD`, read in LOCAL time.
 *
 * `toISOString()` would be the obvious one-liner and is wrong for exactly the
 * reason above — it converts to UTC first, so a date created at local midnight
 * east of Greenwich comes back as the previous day. The column is a `date`;
 * an ISO timestamp must never reach it.
 */
export function formatDateOnly(date: Date): string {
  const year = String(date.getFullYear()).padStart(4, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/** Today as the form's default. Local, for the same reason as everything above. */
export function todayDateOnly(): string {
  return formatDateOnly(new Date())
}
