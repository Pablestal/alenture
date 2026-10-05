import { useMemo } from 'react'

import { hasActiveFilters, isPlaceVisible } from '@/features/layers/domain/placeFilters'
import { useMapView } from '@/features/layers/state/useMapView'
import type { PlaceWithStats } from '@/features/places/domain/Place'
import { usePlaceEdit } from '@/features/places/state/usePlaceEdit'
import { usePlacement } from '@/features/places/state/usePlacement'
import { usePlaces } from '@/features/places/state/usePlaces'

/**
 * The places the map should draw. Client-side over the loaded list — no query
 * knows about any of this.
 *
 * Filters are suspended for the whole of a placement or an edit. Those flows
 * own the map: the existing markers are already dimmed and inert for their
 * duration, and having some of them also vanish would be a second thing
 * happening to the map at the moment the user is trying to position a pin
 * against it. It would also make the neighbours you are placing relative to
 * disappear, which is what they are there for.
 *
 * Note this returns the SAME array when nothing is filtered, so `PlaceMarkers`
 * does not re-key every marker the first time the panel is opened.
 */
export function useVisiblePlaces(): PlaceWithStats[] {
  const { places } = usePlaces()
  const { filters } = useMapView()
  const { mode } = usePlacement()
  const { draft: editDraft } = usePlaceEdit()

  const isFlowActive = mode !== 'idle' || editDraft !== null

  return useMemo(() => {
    if (isFlowActive || !hasActiveFilters(filters)) {
      return places
    }
    return places.filter((place) => isPlaceVisible(place, filters))
  }, [places, filters, isFlowActive])
}
