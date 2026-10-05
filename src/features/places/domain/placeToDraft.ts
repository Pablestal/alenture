import type { PlaceWithStats } from '@/features/places/domain/Place'
import type { PlaceDraft } from '@/features/places/domain/placeDraft'
import { formatDateOnly } from '@/features/places/domain/dateOnly'

/**
 * A saved place in the shape the form speaks.
 *
 * The detail panel renders `PlaceForm`, and `PlaceForm` takes a draft — so the
 * one field list stays one field list, and a field added for the add flow
 * cannot quietly fail to appear in the detail one. Editing arrives in 9b and
 * takes this as its starting value; nothing here assumes read-only.
 *
 * `lastVisit`, not `firstVisit`. They are the same date while a place has zero
 * or one visit, which is every place today. The choice is for the day they
 * differ: "when was I there" about a place visited more than once is most
 * honestly answered with the most recent time, and `firstVisit` would freeze
 * the panel on an answer that gets older every trip.
 *
 * `source` is 'manual' to satisfy the shape, and is the one field here that
 * means nothing. Nothing reads the column back — it is written at insert and
 * never mapped onto a `Place` — so this cannot be the stored value and does not
 * try to be. The edit path does not consult it either: `toPlacePatch` derives
 * `source` from whether the name changed, which is the whole rule and needs no
 * knowledge of what is stored. Anything that ever does need the real value has
 * to read it from the database, not from here.
 */
export function placeToDraft(place: PlaceWithStats): PlaceDraft {
  return {
    name: place.name,
    // Empty means "been here, don't remember when" in both directions: it is
    // what an absent date becomes here, and what produces no visit on save.
    startedOn: place.lastVisit ? formatDateOnly(place.lastVisit) : '',
    notes: place.notes ?? '',
    layerId: place.layerId,
    coordinates: { lat: place.lat, lng: place.lng },
    countryCode: place.countryCode,
    source: 'manual',
  }
}
