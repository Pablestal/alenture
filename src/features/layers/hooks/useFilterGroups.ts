import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import type { FilterGroup } from '@/features/layers/domain/filterGroups'
import { buildCountryGroups, buildYearGroups } from '@/features/layers/domain/filterGroups'
import { placeCountry } from '@/features/layers/domain/placeFilters'
import { formatCountryName } from '@/features/places/domain/countryName'
import { usePlaces } from '@/features/places/state/usePlaces'

export interface FilterGroups {
  years: FilterGroup<number | null>[]
  countries: FilterGroup<string | null>[]
  /** Alpha-2 code to its localised name. Missing where `Intl` does not know the code. */
  countryNames: ReadonlyMap<string, string>
}

/**
 * The panel's rows, derived from the loaded list rather than queried.
 *
 * `useMemo` over `places`, which is what makes a newly saved place appear in
 * its year and its country with no refetch — the optimistic entry is already in
 * that array before the request lands.
 *
 * Derived here rather than in `MapViewProvider` on purpose: the provider holds
 * the lens and does not know the list, so this is the seam between the two.
 */
export function useFilterGroups(): FilterGroups {
  const { places } = usePlaces()
  const { i18n } = useTranslation()
  const locale = i18n.language

  return useMemo(() => {
    const countryNames = new Map<string, string>()
    for (const place of places) {
      const code = placeCountry(place)
      // `formatCountryName` hands back null for a code Intl cannot name, and
      // the row then falls back to the code itself — which is the same thing
      // the detail panel does with it, and the reason both go through it.
      if (code !== null && !countryNames.has(code)) {
        const name = formatCountryName(code, locale)
        if (name !== null) {
          countryNames.set(code, name)
        }
      }
    }

    return {
      years: buildYearGroups(places),
      countries: buildCountryGroups(places, countryNames, locale),
      countryNames,
    }
  }, [places, locale])
}
