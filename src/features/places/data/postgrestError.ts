import type { PostgrestError } from '@supabase/supabase-js'

import { RepositoryError } from '@/features/places/data/RepositoryError'

/**
 * Postgres codes stop here. Nothing above `data/` switches on one.
 *
 * Shared by every Supabase repository so the same failure does not become two
 * different `kind`s depending on which table it came from.
 */
export function toRepositoryError(error: PostgrestError, what: string): RepositoryError {
  switch (error.code) {
    // JWT missing, invalid or expired.
    case 'PGRST301':
    // insufficient_privilege — in practice, a write with no session behind it.
    case '42501':
      return RepositoryError.unauthenticated()
    // Single-row request matched nothing.
    case 'PGRST116':
      return RepositoryError.notFound(what)
    // foreign_key_violation. On visits this is the composite (place_id, user_id)
    // key refusing to attach a visit to a place that is not there, or not yours
    // — which from the caller's side is the place not existing.
    //
    // Narrow but reachable from `createPlace`, which writes the place first and
    // then references the id it just got back. The FK holds unless auth.uid()
    // changes between the two writes: an account switch mid-flight stamps the
    // visit with a different user_id, and (place_id, new_user_id) is not a row.
    // It is also reachable from any caller that supplies a placeId of its own,
    // which the interface permits.
    case '23503':
      return RepositoryError.notFound(what)
    default:
      return RepositoryError.unknown(error)
  }
}
