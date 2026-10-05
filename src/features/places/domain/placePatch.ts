import type { PlacePatch, PlaceWithStats } from '@/features/places/domain/Place'
import type { PlaceDraft } from '@/features/places/domain/placeDraft'
import { emptyToNull } from '@/features/places/domain/placeDraft'
import { placeToDraft } from '@/features/places/domain/placeToDraft'

/**
 * What actually changed about the place itself, as a patch.
 *
 * Only changed keys. An untouched field must be absent rather than present and
 * equal: `toUpdate` sends exactly the keys it is given, so a full patch would
 * rewrite every column on every save and move `updated_at` for an edit that
 * changed nothing.
 *
 * The date is not here. It lives in `visits`, and what to do about it is
 * `resolveVisitChange`'s answer — see the note on that module for why the seam
 * is drawn there and not in the form.
 *
 * ## `source`
 *
 * A name that changed makes the row 'manual', because a name a person typed is
 * a name a person typed whatever the geocoder originally offered. A name that
 * did not change leaves the key absent, so the column keeps whatever it holds —
 * which is the whole rule for a notes-only edit, and it needs no knowledge of
 * the current value. That matters: `source` is written and never read back, so
 * nothing above `data/` could tell you what it is. Deriving the patch from the
 * change rather than from the stored value is what makes that survivable.
 */
export function toPlacePatch(place: PlaceWithStats, draft: PlaceDraft): PlacePatch {
  const patch: PlacePatch = {}

  // Trimmed before comparing, matching `toNewPlace`: adding a trailing space to
  // a name is not an edit, and must not be recorded as one.
  const name = draft.name.trim()
  if (name !== place.name) {
    patch.name = name
    patch.source = 'manual'
  }

  const notes = emptyToNull(draft.notes)
  if (notes !== place.notes) {
    patch.notes = notes
  }

  // Null is a value here, not an absence: unfiling a place is an edit like any
  // other, and `!==` says so where a truthiness check would have quietly
  // refused to write it.
  if (draft.layerId !== place.layerId) {
    patch.layerId = draft.layerId
  }

  /*
   * The pin. Compared exactly, and sent as a pair or not at all: `lat` and
   * `lng` are one fact about where the user stood, and a patch carrying half of
   * it would describe a point nobody chose.
   *
   * `geom` is not here and must never be — it is generated from these two, and
   * Postgres rejects any update that names it.
   */
  if (draft.coordinates.lat !== place.lat || draft.coordinates.lng !== place.lng) {
    patch.lat = draft.coordinates.lat
    patch.lng = draft.coordinates.lng
  }

  return patch
}

/** True when the patch would write nothing, so the request can be skipped. */
export function isEmptyPatch(patch: PlacePatch): boolean {
  return Object.keys(patch).length === 0
}

/**
 * Whether the form holds anything the user would be sorry to lose.
 *
 * Compared against the raw draft, NOT the trimmed patch: the question here is
 * "have you typed since you opened this", and answering it with the same
 * normalisation the save uses would let a change the user can see in the field
 * be discarded without asking. `toPlacePatch` is deliberately stricter, and the
 * two disagreeing on a trailing space is the correct outcome in both places.
 */
export function isDraftDirty(place: PlaceWithStats, draft: PlaceDraft): boolean {
  const original = placeToDraft(place)
  return (
    draft.name !== original.name ||
    draft.notes !== original.notes ||
    draft.startedOn !== original.startedOn ||
    // The picker has no text to look half-typed, so without this a user who
    // only refiled a place and then closed the panel would lose the change
    // without being asked — the one edit that leaves no trace on screen.
    draft.layerId !== original.layerId ||
    // A moved pin is unsaved work like any other, and this is the only thing
    // that says so — the coordinates have no control to look dirty in. Compared
    // exactly, so a drag that ends a few metres from where it started still
    // counts: two drags never produce the same float, and the failure that
    // matters is discarding a move without asking, not asking about a move too
    // small to see.
    draft.coordinates.lat !== original.coordinates.lat ||
    draft.coordinates.lng !== original.coordinates.lng
  )
}
