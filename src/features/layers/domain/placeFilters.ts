import type { PlaceWithStats } from '@/features/places/domain/Place'

/**
 * The year a place is filed under, or null when it has no visit to date it.
 *
 * `lastVisit`, not `firstVisit`: with at most one visit per place — the form's
 * limit, not the schema's — the two are the same value, and the most recent one
 * is the better answer for the day they differ. Which is a day this function
 * does not survive: a place visited across several years belongs in several
 * rows, and that is the timeline's problem to hand back a list here rather than
 * a single year.
 *
 * The date is a `date` column parsed at local midnight by `parseDateOnly`, so
 * `getFullYear()` reads the calendar year it was written as.
 */
export function placeYear(place: PlaceWithStats): number | null {
  return place.lastVisit === null ? null : place.lastVisit.getFullYear()
}

/**
 * The country a place is filed under, upper-cased, or null when reverse
 * geocoding could not resolve one.
 *
 * Case-folded for the same reason `BrandCard` folds its own set: a stray
 * lowercase code would otherwise be a second country with one place in it.
 */
export function placeCountry(place: PlaceWithStats): string | null {
  return place.countryCode === null ? null : place.countryCode.toUpperCase()
}

/**
 * What the map is NOT showing.
 *
 * Three dimensions, and they are not all the same kind of thing. The year and
 * the country are DERIVED — nobody chose them, they fall out of a date and a
 * coordinate, and every place has whatever it has. The layer is ASSIGNED: the
 * user made it and filed the place under it by hand. Both belong here because
 * the question this type answers is the same for all three — is this place
 * drawn — but see `Layer` for why only one of them is worth a table.
 *
 * Stored as the hidden set rather than the visible one, which is the whole
 * design of this feature and not an implementation detail. Everything on is
 * then the empty set — the default asked for, for free — and, more importantly,
 * a place saved into a year, a country or a layer nobody has used yet arrives
 * VISIBLE. An allow-list would default it to hidden, which is the panel
 * silently swallowing the place the user just saved and watching them conclude
 * the save failed. That matters most for layers, where the set the user is
 * filing into is one they only just made.
 *
 * `null` is a member in its own right, standing for the no-date, no-country and
 * unassigned rows. A `Set` holds it perfectly well, and a `'__none__'` sentinel
 * would put a string in a set of numbers to say something the type can say
 * itself.
 */
export interface PlaceFilters {
  hiddenYears: ReadonlySet<number | null>
  hiddenCountries: ReadonlySet<string | null>
  /** Layer ids. `null` is the Unassigned row. */
  hiddenLayers: ReadonlySet<string | null>
}

/** Everything on. */
export const NO_FILTERS: PlaceFilters = {
  hiddenYears: new Set(),
  hiddenCountries: new Set(),
  hiddenLayers: new Set(),
}

/**
 * All three sections are AND, not OR: a place hidden by any one of them is
 * hidden.
 *
 * That is the reading of a panel whose rows are all checkboxes — turning 2019
 * off means "not 2019", whatever the countries say — and it is the only reading
 * under which turning everything off leaves an empty map rather than a full one.
 */
export function isPlaceVisible(place: PlaceWithStats, filters: PlaceFilters): boolean {
  return (
    !filters.hiddenYears.has(placeYear(place)) &&
    !filters.hiddenCountries.has(placeCountry(place)) &&
    !filters.hiddenLayers.has(place.layerId)
  )
}

/** Whether anything at all is filtered out. */
export function hasActiveFilters(filters: PlaceFilters): boolean {
  return (
    filters.hiddenYears.size > 0 ||
    filters.hiddenCountries.size > 0 ||
    filters.hiddenLayers.size > 0
  )
}

/** A set with `value` added or removed. Never mutated — the state is read as a value. */
export function toggleIn<T>(set: ReadonlySet<T>, value: T): ReadonlySet<T> {
  const next = new Set(set)
  if (!next.delete(value)) {
    next.add(value)
  }
  return next
}
