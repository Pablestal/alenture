/**
 * Configuration the app cannot start without.
 *
 * Named rather than open: every entry here is a deliberate decision that a
 * missing value is a broken build and not a runtime condition to absorb. A
 * variable with a sensible default does not belong in this union — it belongs
 * in the module that defaults it.
 *
 * The two map styles arrived here by that test rather than by being map
 * styles. A single style URL defensibly defaulted: nothing could disagree with
 * it, and a style that fails to load is a blank map, which nobody mistakes for
 * a working one. The moment the layers panel offered a second one they became
 * partners — point one at a self-hosted tileserver, forget the other, and half
 * the switch quietly leaves your instance for the public one. That is the same
 * failure the geocoding pair is named here for.
 */
type RequiredEnvName =
  | 'VITE_MAP_STYLE_DARK_URL'
  | 'VITE_MAP_STYLE_LIGHT_URL'
  | 'VITE_SUPABASE_URL'
  | 'VITE_SUPABASE_ANON_KEY'
  | 'VITE_GEOCODING_API_URL'
  | 'VITE_GEOCODING_REVERSE_URL'

/**
 * Throws at module evaluation, which means at startup, which means the app does
 * not render at all. That is the point: a missing variable is a bug in the
 * setup, and the alternative is a feature that fails once per use in a way that
 * is indistinguishable from the service having nothing to say.
 */
export function requireEnv(name: RequiredEnvName): string {
  const value = import.meta.env[name]
  if (!value) {
    // `.env`, not `.env.local`. Vite loads and merges both, so a variable put
    // in the wrong one works — and the next person to go looking finds the
    // file it should have been in and concludes it was never set.
    throw new Error(`Missing ${name}. Copy .env.example to .env and fill it in.`)
  }
  return value
}
