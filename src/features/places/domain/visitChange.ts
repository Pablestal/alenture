import { formatDateOnly } from '@/features/places/domain/dateOnly'
import type { PlaceWithStats } from '@/features/places/domain/Place'
import type { PlaceDraft } from '@/features/places/domain/placeDraft'

/**
 * What an edited date means for the `visits` table.
 *
 * 'none' is the one that matters most. A date that did not change must produce
 * no visit work at all — no read to find the visit, no write, no round trip.
 * Renaming a place is the common edit and it stays a single request because of
 * this branch. Anyone tempted to fold this function into the caller and always
 * fetch "just to be sure" would double the traffic on the ordinary case without
 * changing a single stored row.
 *
 * 'clear' soft-deletes every live visit of the place rather than one, because
 * "I don't remember when" is a statement about the place, not about one of its
 * days.
 */
export type VisitChange = 'none' | 'create' | 'update' | 'clear'

/**
 * The visit side of an edit, from the date the panel showed and the date the
 * form now holds.
 *
 * Compared against `lastVisit` because that is what the panel displays — the
 * user is editing the date in front of them, and any other comparison would
 * make the form's own value disagree with what it does.
 */
export function resolveVisitChange(place: PlaceWithStats, draft: PlaceDraft): VisitChange {
  const original = place.lastVisit ? formatDateOnly(place.lastVisit) : ''
  const next = draft.startedOn

  if (original === next) {
    return 'none'
  }
  if (original === '') {
    return 'create'
  }
  if (next === '') {
    return 'clear'
  }
  return 'update'
}
