/** The signed-in person, as the app understands them. Not a Supabase `User`. */
export interface AuthUser {
  id: string
  email: string
  /** Single character for the account button. Already uppercased. */
  initial: string
}

/**
 * First letter of the email, for the avatar. `Array.from` rather than `[0]`
 * because an address can start with a character outside the BMP, and half a
 * surrogate pair renders as a replacement glyph.
 */
export function initialFor(email: string): string {
  const first = Array.from(email.trim())[0]
  return first ? first.toUpperCase() : '?'
}
