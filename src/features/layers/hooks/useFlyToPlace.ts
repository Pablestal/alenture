import { useCallback } from 'react'

import { useFlyTo } from '@/features/map/hooks/useFlyTo'
import type { PlaceWithStats } from '@/features/places/domain/Place'
import { useSelection } from '@/features/places/state/useSelection'

/**
 * Close enough to see the street the pin is on, which is the thing the
 * coordinate is a claim about — a place is the square you stood in, not the
 * city's administrative centre.
 *
 * Deliberately closer than the search hook's arrival zoom. Search is looking
 * for somewhere you have not been; this is returning to somewhere you have,
 * where the question is "which spot did I mark", not "where is this town".
 */
const PLACE_ZOOM = 14

/**
 * What pressing a place in the index does: fly to it, and open its detail.
 *
 * Both, and in that order. Selecting alone would leave the panel describing a
 * pin somewhere off screen; flying alone would be navigation to a marker the
 * user then has to press a second time to read. The index row is a way to
 * *arrive* at a place, so it does the whole arrival.
 *
 * This is the one thing in the app that moves the camera on selection.
 * `PlaceDetailContainer` explains why pressing a marker does not: that marker
 * is already on screen, and moving would take the user somewhere they did not
 * ask to go. An index row is the opposite case — the place is somewhere you
 * cannot see, and the row is the asking.
 */
export function useFlyToPlace(): (place: PlaceWithStats) => void {
  const flyTo = useFlyTo()
  const { select } = useSelection()

  return useCallback(
    (place: PlaceWithStats) => {
      flyTo({ lat: place.lat, lng: place.lng }, PLACE_ZOOM)
      select(place.id)
    },
    [flyTo, select],
  )
}
