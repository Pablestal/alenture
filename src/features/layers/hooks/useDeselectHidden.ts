import { useEffect } from 'react'

import { isPlaceVisible } from '@/features/layers/domain/placeFilters'
import { useMapView } from '@/features/layers/state/useMapView'
import type { PlaceWithStats } from '@/features/places/domain/Place'
import { useSelection } from '@/features/places/state/useSelection'

/**
 * Closes the detail panel when its place is filtered out from under it —
 * whether by its year, its country or its layer.
 *
 * Showing the details of a marker that is not on screen is incoherent — there
 * is an accent pin's worth of UI claiming to be about a place the map is
 * currently denying. Clearing the selection rather than merely hiding the panel
 * is what makes the pin and the panel go together.
 *
 * Lives with the panel rather than in `MapViewProvider` because that provider
 * knows neither the list nor the selection, and giving it both to run one
 * effect would be the merge this feature exists to avoid.
 *
 * `place` is null when nothing is selected or the selection has outlived its
 * place, in which case the panel is already showing nothing.
 */
export function useDeselectHidden(place: PlaceWithStats | null): void {
  const { filters } = useMapView()
  const { clear } = useSelection()

  useEffect(() => {
    if (place !== null && !isPlaceVisible(place, filters)) {
      clear()
    }
  }, [place, filters, clear])
}
