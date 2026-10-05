/**
 * How long the text a place carries may be. Pure, and the last word on it —
 * the form, the repository and the column all answer to these two numbers.
 *
 * Measured on the trimmed value, because the trimmed value is what is stored:
 * `toNewPlace` trims the name and `emptyToNull` trims the notes, so judging the
 * raw string would reject text the database would have accepted.
 */

/** Mirrors `check (char_length(trim(name)) between 1 and 200)` on the column. */
export const MAX_NAME_LENGTH = 200

/**
 * Deliberately below the column's 5000. The form is the real limit; the check
 * constraint is a backstop that only fires if something bypasses the UI.
 */
export const MAX_NOTES_LENGTH = 2000

/** The length that counts — what would be written, not what is on screen. */
export function textLength(value: string): number {
  return value.trim().length
}

export function isValidNameLength(name: string): boolean {
  return textLength(name) <= MAX_NAME_LENGTH
}

export function isValidNotesLength(notes: string): boolean {
  return textLength(notes) <= MAX_NOTES_LENGTH
}

export class TextTooLongError extends Error {
  readonly field: 'name' | 'notes'
  readonly limit: number

  constructor(field: 'name' | 'notes', limit: number) {
    super(`${field} exceeds ${limit} characters`)
    this.name = 'TextTooLongError'
    this.field = field
    this.limit = limit
  }
}

/**
 * Throws rather than returning a flag, so over-long text cannot be written by
 * accident. Null notes are absent, not empty, and pass.
 */
export function assertValidTextLengths(name: string, notes: string | null): void {
  if (!isValidNameLength(name)) {
    throw new TextTooLongError('name', MAX_NAME_LENGTH)
  }
  if (notes !== null && !isValidNotesLength(notes)) {
    throw new TextTooLongError('notes', MAX_NOTES_LENGTH)
  }
}

/**
 * The same check for a partial edit, where either field may be absent. Each
 * present value is judged on its own: an edit that only rewrites the notes
 * carries no name to measure, and refusing it would be wrong.
 */
export function assertValidTextLengthPatch(name?: string, notes?: string | null): void {
  if (name !== undefined && !isValidNameLength(name)) {
    throw new TextTooLongError('name', MAX_NAME_LENGTH)
  }
  if (notes !== undefined && notes !== null && !isValidNotesLength(notes)) {
    throw new TextTooLongError('notes', MAX_NOTES_LENGTH)
  }
}
