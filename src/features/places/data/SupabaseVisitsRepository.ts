import { toRepositoryError } from '@/features/places/data/postgrestError'
import type { VisitsRepository } from '@/features/places/data/VisitsRepository'
import { toVisit, toVisitInsert, toVisitUpdate } from '@/features/places/data/visitRowMapper'
import { isValidRating } from '@/features/places/domain/Visit'
import { RepositoryError } from '@/features/places/data/RepositoryError'
import { supabase } from '@/shared/lib/supabase'

export const supabaseVisitsRepository: VisitsRepository = {
  async listByPlace(placeId) {
    const { data, error } = await supabase
      .from('visits')
      .select('*')
      .eq('place_id', placeId)
      .is('deleted_at', null)
      // Oldest first, so the last element is the most recent visit — which is
      // the one the detail panel shows, and therefore the one an edited date
      // belongs to.
      .order('started_on', { ascending: true })

    if (error) {
      throw toRepositoryError(error, 'Visit')
    }
    // No rows is an empty list, never an error: a place with no visits is a
    // place someone remembers being at and not when.
    return (data ?? []).map(toVisit)
  },

  async create(visit) {
    // Last line of defence, mirroring the column's check constraint. The form
    // validates too, for the message; the repository does not trust its callers.
    if (visit.rating !== null && !isValidRating(visit.rating)) {
      throw RepositoryError.unknown(new Error(`Rating out of range: ${visit.rating}`))
    }
    if (visit.endedOn !== null && visit.endedOn < visit.startedOn) {
      throw RepositoryError.unknown(new Error('A visit cannot end before it started'))
    }

    // Client-side, so creating a visit offline stays possible later.
    const id = crypto.randomUUID()

    const { data, error } = await supabase
      .from('visits')
      .insert(toVisitInsert(id, visit))
      .select('*')
      .single()

    if (error) {
      // 'Place', not 'Visit': the only foreign key here points at the place, so
      // a violation means the place is missing, not the visit.
      throw toRepositoryError(error, 'Place')
    }
    return toVisit(data)
  },

  async update(id, patch) {
    // Last line of defence, mirroring the column's check constraint.
    if (patch.rating !== undefined && patch.rating !== null && !isValidRating(patch.rating)) {
      throw RepositoryError.unknown(new Error(`Rating out of range: ${patch.rating}`))
    }
    /*
     * Only checkable when the patch carries both ends. A patch that moves only
     * `started_on` could still cross a stored `ended_on`, and this layer cannot
     * see it without a read it has no other reason to do — so that case is the
     * database's to refuse. Nothing writes `ended_on` yet, which is the only
     * reason that is tolerable; the check goes to the schema when something does.
     */
    if (
      patch.startedOn !== undefined &&
      patch.endedOn !== undefined &&
      patch.endedOn !== null &&
      patch.endedOn < patch.startedOn
    ) {
      throw RepositoryError.unknown(new Error('A visit cannot end before it started'))
    }

    const { data, error } = await supabase
      .from('visits')
      .update(toVisitUpdate(patch))
      // Scoped to live rows: editing a deleted visit reports 'not-found'
      // instead of quietly resurrecting it.
      .eq('id', id)
      .is('deleted_at', null)
      .select('*')
      .maybeSingle()

    if (error) {
      throw toRepositoryError(error, 'Visit')
    }
    if (!data) {
      throw RepositoryError.notFound('Visit')
    }
    return toVisit(data)
  },

  async removeByPlace(placeId) {
    // Scoped to live rows so a second delete of the same place is a no-op
    // rather than moving the tombstone's date forward.
    const { error } = await supabase
      .from('visits')
      .update({ deleted_at: new Date().toISOString() })
      .eq('place_id', placeId)
      .is('deleted_at', null)

    if (error) {
      throw toRepositoryError(error, 'Place')
    }
    // No row check. A place with no visits — "been here, don't remember when" —
    // is a legitimate place, and sweeping its zero visits succeeded.
  },
}
