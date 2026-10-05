/**
 * A day at a place. N per place.
 *
 * Lives under `places/` because that is the only thing that creates one today.
 * When the timeline screen arrives and visits are read, ordered and grouped by
 * trip in their own right, this and its repository move to `features/visits/`.
 */
export interface Visit {
  id: string
  placeId: string
  /** Null until trips can be attached. */
  tripId: string | null
  /** A calendar day, never an instant. Local midnight. */
  startedOn: Date
  /** Null for a single-day visit. */
  endedOn: Date | null
  /**
   * 1–5, or null for unrated. The rating belongs here and not on the place: it
   * is how *this stay* was, and the same place can be worth a different number
   * on a different day.
   */
  rating: number | null
  notes: string | null
  createdAt: Date
  updatedAt: Date
}

/** No id — the repository mints it. No timestamps, no `user_id`. */
export type NewVisit = Omit<Visit, 'id' | 'createdAt' | 'updatedAt'>

/**
 * A partial edit, mirroring `PlacePatch`. `placeId` is in it because the type
 * says every writable field is — nothing moves a visit between places today,
 * and the composite foreign key would refuse it across owners anyway.
 */
export type VisitPatch = Partial<NewVisit>

export const MIN_RATING = 1
export const MAX_RATING = 5

/** Mirrors the `rating between 1 and 5` check, so a bad value fails before the round trip. */
export function isValidRating(value: number): boolean {
  return Number.isInteger(value) && value >= MIN_RATING && value <= MAX_RATING
}
