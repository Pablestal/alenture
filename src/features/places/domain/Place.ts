/**
 * A city you have been to, as the app understands it. Not a `places` row.
 *
 * The coordinate is where you actually were — a square, a street — not the
 * city's administrative centre.
 *
 * There is deliberately no `deletedAt`: a deleted place never becomes a `Place`.
 * Anything holding one can assume it exists.
 */
export interface Place {
  id: string
  name: string
  lat: number
  lng: number
  /**
   * The user's own layer this place is filed under, or null for unassigned.
   *
   * One, not many. Going one-to-many later is additive — a join table seeded
   * from this column — so nothing here forecloses it.
   *
   * Unassigned is a real answer and not a missing one: filing is work, and a
   * place is worth saving before you have decided where it goes.
   */
  layerId: string | null
  /** ISO 3166-1 alpha-2, or null when it could not be resolved. */
  countryCode: string | null
  address: string | null
  notes: string | null
  createdAt: Date
  updatedAt: Date
}

/**
 * A place plus the visit figures the `places_active` view already computes.
 * Kept separate so `Place` does not carry columns that only the list screen
 * asked for.
 */
export interface PlaceWithStats extends Place {
  visitCount: number
  /** Null when the place has no visits yet. */
  firstVisit: Date | null
  lastVisit: Date | null
}

/**
 * Where a row came from. Mirrors the `check (source in (...))` on the column.
 *
 * 'search' means the name is the geocoder's, accepted as given; 'manual' means
 * a person typed or corrected it. 'import' has no producer yet.
 */
export type PlaceSource = 'manual' | 'search' | 'import'

/**
 * What a caller supplies to create a place. No id — the repository mints it, so
 * `crypto.randomUUID()` lives in exactly one place. No timestamps — the database
 * owns those. No `user_id` — the column defaults to `auth.uid()`.
 *
 * `source` is here and deliberately not on `Place`. It is a fact about how a
 * row came to exist, not about the city: nothing reading a place needs to know
 * where its name came from, and putting it on `Place` would hand the field to
 * every marker, every statistic and the timeline to carry and ignore. So it
 * travels in and is never read back — `toPlace` does not map the column.
 *
 * What that gives up: a wrong `source` is invisible to the app, and only the
 * database would show it. Tolerable while the field has exactly one producer.
 * A second writer is the moment to reconsider — two writers and no readers is
 * how a column drifts into meaning nothing.
 */
export type NewPlace = Omit<Place, 'id' | 'createdAt' | 'updatedAt'> & {
  source: PlaceSource
}

/** A partial edit. Every field a caller may legitimately change. */
export type PlacePatch = Partial<NewPlace>
