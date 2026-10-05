import { formatDateOnly, parseDateOnly, parseNullableDateOnly } from '@/features/places/domain/dateOnly'
import type { NewVisit, Visit, VisitPatch } from '@/features/places/domain/Visit'
import type { Database } from '@/types/database'

/** The boundary. Generated types appear here and in no file above this one. */
type VisitRow = Database['public']['Tables']['visits']['Row']
type VisitInsert = Database['public']['Tables']['visits']['Insert']
type VisitUpdate = Database['public']['Tables']['visits']['Update']

export function toVisit(row: VisitRow): Visit {
  return {
    id: row.id,
    placeId: row.place_id,
    tripId: row.trip_id,
    startedOn: parseDateOnly(row.started_on),
    endedOn: parseNullableDateOnly(row.ended_on),
    rating: row.rating,
    notes: row.notes,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  }
}

/**
 * `user_id` is absent by design: the column defaults to auth.uid().
 *
 * The dates go through `formatDateOnly` rather than `toISOString()` — these are
 * `date` columns, and a timestamp reaching one is how a visit ends up recorded
 * on the wrong day.
 */
export function toVisitInsert(id: string, visit: NewVisit): VisitInsert {
  return {
    id,
    place_id: visit.placeId,
    trip_id: visit.tripId,
    started_on: formatDateOnly(visit.startedOn),
    ended_on: visit.endedOn === null ? null : formatDateOnly(visit.endedOn),
    rating: visit.rating,
    notes: visit.notes,
  }
}

/**
 * Only the keys the caller actually set, for the same reason as the place
 * mapper's `toUpdate`: spreading the whole patch would send `undefined` for
 * untouched fields, which PostgREST writes as null. On this table that would
 * turn an edit of the date into an erasure of the rating beside it.
 *
 * The dates go through `formatDateOnly` rather than `toISOString()` — these are
 * `date` columns, and a timestamp reaching one is how a visit ends up recorded
 * on the wrong day.
 */
export function toVisitUpdate(patch: VisitPatch): VisitUpdate {
  const update: VisitUpdate = {}
  if (patch.placeId !== undefined) update.place_id = patch.placeId
  if (patch.tripId !== undefined) update.trip_id = patch.tripId
  if (patch.startedOn !== undefined) update.started_on = formatDateOnly(patch.startedOn)
  if (patch.endedOn !== undefined) {
    update.ended_on = patch.endedOn === null ? null : formatDateOnly(patch.endedOn)
  }
  if (patch.rating !== undefined) update.rating = patch.rating
  if (patch.notes !== undefined) update.notes = patch.notes
  return update
}
