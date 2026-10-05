import type { Coordinates } from '@/features/places/domain/coordinates'
import { areValidCoordinates } from '@/features/places/domain/coordinates'
import { parseDateOnly } from '@/features/places/domain/dateOnly'
import type { NewPlace, PlaceSource } from '@/features/places/domain/Place'
import {
  MAX_NAME_LENGTH,
  MAX_NOTES_LENGTH,
  textLength,
} from '@/features/places/domain/textLimits'
import type { NewVisit } from '@/features/places/domain/Visit'

/**
 * What the add-place form holds, before it is anything the database would
 * recognise. Strings where the control produces strings — trimming, parsing and
 * the empty-means-absent rule all happen here, in one place, rather than being
 * rediscovered at the point of save.
 */
export interface PlaceDraft {
  /** The city. */
  name: string
  /** `YYYY-MM-DD`, or empty for "been here, don't remember when". */
  startedOn: string
  notes: string
  /**
   * The layer this place is being filed under, or null for none.
   *
   * An id and not a name: the picker offers what exists, and a layer is created
   * in the panel that owns layers rather than invented in passing by a form
   * field. Null is a legitimate choice with its own pill, not an empty state.
   */
  layerId: string | null
  coordinates: Coordinates
  /**
   * ISO 3166-1 alpha-2, from the geocoder. Null when it could not be asked or
   * had no answer.
   *
   * Not a field, and not the user's to edit: it belongs to the coordinate, not
   * to the name. Overwriting a prefilled "Salamanca" with "the place with the
   * bridge" does not move the pin out of Spain, so the code stands.
   */
  countryCode: string | null
  /**
   * 'search' while the name is the geocoder's, untouched. The moment anyone
   * types in the name field — correcting the guess or writing over an empty
   * one — it is 'manual' and stays there.
   */
  source: PlaceSource
}

/** Which control the message belongs under. */
export type PlaceDraftField = 'name' | 'startedOn' | 'notes' | 'coordinates'

/**
 * i18n keys, never text. `domain/` has no business knowing what language the
 * user reads — the form calls `t()` on whatever comes back.
 *
 * Spelled out as literals rather than `string` so the typed resources can check
 * them. A key renamed in the locale file becomes a compile error here, which is
 * the whole point of declaring the resources.
 */
export type PlaceDraftErrorKey =
  | 'form.errors.nameRequired'
  | 'form.errors.nameTooLong'
  | 'form.errors.notesTooLong'
  | 'form.errors.dateInvalid'
  | 'form.errors.coordinatesInvalid'

export type PlaceDraftErrors = Partial<Record<PlaceDraftField, PlaceDraftErrorKey>>

export function validatePlaceDraft(draft: PlaceDraft): PlaceDraftErrors {
  const errors: PlaceDraftErrors = {}

  // Trimmed before measuring, matching the column's
  // `char_length(trim(name)) between 1 and 200`. A name of spaces is empty.
  const name = draft.name.trim()
  if (name.length === 0) {
    errors.name = 'form.errors.nameRequired'
  } else if (name.length > MAX_NAME_LENGTH) {
    errors.name = 'form.errors.nameTooLong'
  }

  // Notes have no lower bound — a place with nothing written down is a place.
  if (textLength(draft.notes) > MAX_NOTES_LENGTH) {
    errors.notes = 'form.errors.notesTooLong'
  }

  if (draft.startedOn !== '' && !isDateOnly(draft.startedOn)) {
    errors.startedOn = 'form.errors.dateInvalid'
  }

  if (!areValidCoordinates(draft.coordinates.lat, draft.coordinates.lng)) {
    errors.coordinates = 'form.errors.coordinatesInvalid'
  }

  return errors
}

export function hasErrors(errors: PlaceDraftErrors): boolean {
  return Object.keys(errors).length > 0
}

/**
 * Shape and calendar validity both. `2026-02-30` matches the pattern and is not
 * a day, so the parsed date is normalised back and compared.
 */
function isDateOnly(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false
  }
  const [year, month, day] = value.split('-').map(Number)
  if (year === undefined || month === undefined || day === undefined) {
    return false
  }
  const date = new Date(year, month - 1, day)
  return (
    date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
  )
}

/**
 * The draft as a place.
 *
 * `address` is null because nothing produces one: reverse geocoding answers
 * with a settlement, and a settlement is not a street address. `source_ref` is
 * not written either — the OSM id identifies the settlement, not the spot the
 * user stood in, and what that column should hold is still an open question.
 *
 * The note goes on the place, not the visit. There is one notes field in the
 * form and it reads as being about the visit; per-visit notes arrive with the
 * timeline, where there is a visit to attach them to.
 */
export function toNewPlace(draft: PlaceDraft): NewPlace {
  return {
    name: draft.name.trim(),
    lat: draft.coordinates.lat,
    lng: draft.coordinates.lng,
    layerId: draft.layerId,
    countryCode: draft.countryCode,
    address: null,
    notes: emptyToNull(draft.notes),
    source: draft.source,
  }
}

/**
 * The visit the draft implies, or null when it implies none.
 *
 * No date means no visit — "been here, don't remember when" is a place with
 * zero visits, not a visit with a missing day. `started_on` is NOT NULL and
 * there is no honest value to put in it.
 *
 * `rating` is always null: the column and the repository still accept one, but
 * this form no longer asks. The timeline is where a rating will come from.
 */
export function toNewVisit(draft: PlaceDraft, placeId: string): NewVisit | null {
  if (draft.startedOn === '') {
    return null
  }
  return {
    placeId,
    tripId: null,
    startedOn: parseDateOnly(draft.startedOn),
    endedOn: null,
    rating: null,
    notes: null,
  }
}

/**
 * Exported so the edit path trims and nulls exactly as the create path does.
 * Two copies of this rule is how "  " becomes a note on one path and nothing on
 * the other.
 */
export function emptyToNull(value: string): string | null {
  const trimmed = value.trim()
  return trimmed === '' ? null : trimmed
}
