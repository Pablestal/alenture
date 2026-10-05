import { useCallback } from 'react'
import { useMap } from 'react-map-gl/maplibre'

import { FLY_DURATION_MS, useFlyTo } from '@/features/map/hooks/useFlyTo'
import { MAIN_MAP_ID } from '@/features/map/mapId'
import type { SearchResult } from '@/features/search/domain/SearchResult'

/**
 * Where a result with no extent lands: a whole city on screen, roughly.
 *
 * Despite the name, this is the common path, not the rare one — plenty of
 * settlements come back with no `extent` at all. Tune this number, not the cap
 * below, if arrivals feel too close or too far out.
 */
const FALLBACK_ZOOM = 12

/**
 * A safety net, and rarely more than that. Photon's `extent` is the municipal
 * boundary rather than the settlement's footprint, so even a small village
 * spans several kilometres and frames at around z12-13 on its own — measured
 * against real ones, not assumed. The cap only catches whatever comes back
 * genuinely tiny.
 */
const MAX_FIT_ZOOM = 14

/**
 * Flies the map to a result. It writes nothing and selects nothing: search is
 * navigation, and placing a pin is still how a place gets made.
 *
 * The point case is `useFlyTo`, shared with the layers panel's index. What
 * stays here is the part that is about a search result specifically: an extent
 * that knows what a city is and what a village is, and the zoom that follows
 * from it rather than from a guess.
 */
export function useFlyToResult(): (result: SearchResult) => void {
  const map = useMap()[MAIN_MAP_ID]
  const flyTo = useFlyTo()

  return useCallback(
    (result: SearchResult) => {
      if (!result.bbox) {
        flyTo({ lat: result.lat, lng: result.lng }, FALLBACK_ZOOM)
        return
      }

      if (!map) {
        return
      }

      const { west, south, east, north } = result.bbox
      map.fitBounds(
        [
          [west, south],
          [east, north],
        ],
        // The same padding `useFlyTo` reads, for the same reason: the map owns
        // what is covered by open chrome.
        { padding: map.getPadding(), maxZoom: MAX_FIT_ZOOM, duration: FLY_DURATION_MS },
      )
    },
    [map, flyTo],
  )
}
