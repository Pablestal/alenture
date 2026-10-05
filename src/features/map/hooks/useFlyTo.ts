import { useCallback } from 'react'
import { useMap } from 'react-map-gl/maplibre'

import type { Coordinates } from '@/features/places/domain/coordinates'
import { MAIN_MAP_ID } from '@/features/map/mapId'

/** Long enough to read as travel rather than a cut, short enough not to wait. */
export const FLY_DURATION_MS = 1200

/**
 * Flies the map to a point. The one camera move in the app, and it lives here
 * because the map instance does: `MapCanvas` registers under `MAIN_MAP_ID` and
 * anything wanting the camera asks for it by that name rather than being handed
 * a ref.
 *
 * Deliberately takes no default zoom. Every caller has its own reason for the
 * altitude it arrives at — a search result frames a city it has never seen, an
 * index row returns you to a pin you already know — and a shared default would
 * be one number quietly answering two different questions, changed for one
 * caller and silently changing the other.
 *
 * Extracted from `useFlyToResult`, which keeps the half that is genuinely about
 * search results: a `bbox` and the `fitBounds` that frames it. A place has no
 * extent to offer, so it takes this and nothing else.
 */
export function useFlyTo(): (target: Coordinates, zoom: number) => void {
  // Undefined until the map mounts, which is why every call checks rather than
  // asserting.
  const map = useMap()[MAIN_MAP_ID]

  return useCallback(
    (target: Coordinates, zoom: number) => {
      if (!map) {
        return
      }

      map.flyTo({
        center: [target.lng, target.lat],
        zoom,
        // Whatever the map currently reserves for open chrome — the form panel
        // sets it in `MapCanvas`. Read from the map rather than recomputed
        // here, so there is one definition of what is covered.
        padding: map.getPadding(),
        duration: FLY_DURATION_MS,
      })
    },
    [map],
  )
}
