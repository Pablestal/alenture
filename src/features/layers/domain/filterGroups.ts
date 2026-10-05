import type { PlaceWithStats } from '@/features/places/domain/Place'
import { placeCountry, placeYear } from '@/features/layers/domain/placeFilters'

/**
 * One row of a section: the value it filters on and how many places carry it.
 *
 * The count is of what EXISTS, never of what is showing. The panel is a summary
 * as much as a filter, and a count that fell as you unticked rows would be
 * answering a question nobody asked — you can already see what is on the map.
 * Which is why nothing in this file takes a `PlaceFilters`.
 */
export interface FilterGroup<T> {
  /** Null is the "no date" / "no country" row, which is a row and never hidden. */
  value: T
  count: number
}

function tally<T>(places: readonly PlaceWithStats[], key: (place: PlaceWithStats) => T) {
  const counts = new Map<T, number>()
  for (const place of places) {
    const value = key(place)
    counts.set(value, (counts.get(value) ?? 0) + 1)
  }
  return counts
}

/**
 * Years, newest first, with the undated row last.
 *
 * Undated places get a row rather than being dropped: a place with no date is
 * still a place you have been to, and hiding it from the panel would make the
 * years add up to less than the total with nothing on screen to explain the
 * difference.
 */
export function buildYearGroups(places: readonly PlaceWithStats[]): FilterGroup<number | null>[] {
  const counts = tally(places, placeYear)
  const groups: FilterGroup<number | null>[] = []
  let undated = 0

  for (const [value, count] of counts) {
    if (value === null) {
      undated = count
    } else {
      groups.push({ value, count })
    }
  }

  groups.sort((a, b) => (b.value ?? 0) - (a.value ?? 0))
  if (undated > 0) {
    groups.push({ value: null, count: undated })
  }
  return groups
}

/**
 * Countries by count, most-visited first, with the unresolved row last.
 *
 * Ties broken by the caller's own name order rather than by code: the rows are
 * labelled with `Intl` names, and two equal counts sorted by ISO code would
 * read as unsorted to anyone looking at the labels. `names` maps code to the
 * label actually on screen; a code with no entry sorts by itself, which is what
 * `formatCountryName` returning null leaves the row showing anyway.
 */
export function buildCountryGroups(
  places: readonly PlaceWithStats[],
  names: ReadonlyMap<string, string>,
  locale: string,
): FilterGroup<string | null>[] {
  const counts = tally(places, placeCountry)
  const groups: FilterGroup<string | null>[] = []
  let unknown = 0

  for (const [value, count] of counts) {
    if (value === null) {
      unknown = count
    } else {
      groups.push({ value, count })
    }
  }

  const collator = new Intl.Collator(locale)
  groups.sort((a, b) => {
    if (a.count !== b.count) {
      return b.count - a.count
    }
    const left = names.get(a.value ?? '') ?? a.value ?? ''
    const right = names.get(b.value ?? '') ?? b.value ?? ''
    return collator.compare(left, right)
  })

  if (unknown > 0) {
    groups.push({ value: null, count: unknown })
  }
  return groups
}
