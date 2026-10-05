import type { ReactNode } from 'react'
import { useCallback, useMemo, useState } from 'react'

import type { PlaceFilters } from '@/features/layers/domain/placeFilters'
import { NO_FILTERS, toggleIn } from '@/features/layers/domain/placeFilters'
import type { MapStyleId } from '@/features/layers/domain/mapStyle'
import { DEFAULT_MAP_STYLE_ID } from '@/features/layers/domain/mapStyle'
import { MAP_STYLE_URLS } from '@/features/layers/mapStyleUrls'
import type { MapViewContextValue } from '@/features/layers/state/mapViewContext'
import { MapViewContext } from '@/features/layers/state/mapViewContext'

/**
 * Holds the lens, and nothing else. It sees neither the places list nor the
 * layers list: the rows of all three sections are derived where they are shown,
 * by `useFilterGroups` and `useLayerIndex`, so adding a place or a layer updates
 * the panel without anything here being told.
 *
 * That is also why a filter can name a year with no places left in it, or a
 * layer that has been deleted — delete the last place of 2019 and 2019 is
 * hidden-and-absent. Harmless in both cases: the set is only ever read by
 * asking whether it CONTAINS something that exists. The alternative is this
 * provider subscribing to two lists so it can prune sets nobody is reading.
 */
export function MapViewProvider({ children }: { children: ReactNode }) {
  const [filters, setFilters] = useState<PlaceFilters>(NO_FILTERS)
  const [mapStyleId, setMapStyleId] = useState<MapStyleId>(DEFAULT_MAP_STYLE_ID)

  const toggleYear = useCallback((year: number | null) => {
    setFilters((current) => ({ ...current, hiddenYears: toggleIn(current.hiddenYears, year) }))
  }, [])

  const toggleCountry = useCallback((countryCode: string | null) => {
    setFilters((current) => ({
      ...current,
      hiddenCountries: toggleIn(current.hiddenCountries, countryCode),
    }))
  }, [])

  const toggleLayer = useCallback((layerId: string | null) => {
    setFilters((current) => ({
      ...current,
      hiddenLayers: toggleIn(current.hiddenLayers, layerId),
    }))
  }, [])

  const value = useMemo<MapViewContextValue>(
    () => ({
      filters,
      toggleYear,
      toggleCountry,
      toggleLayer,
      mapStyleId,
      mapStyleUrl: MAP_STYLE_URLS[mapStyleId],
      setMapStyleId,
    }),
    [filters, toggleYear, toggleCountry, toggleLayer, mapStyleId],
  )

  return <MapViewContext value={value}>{children}</MapViewContext>
}
