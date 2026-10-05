import { Marker } from 'react-map-gl/maplibre'
import type { MarkerDragEvent } from 'react-map-gl/maplibre'

import { toCoordinates } from '@/features/map/toCoordinates'
import { PlacementPin } from '@/features/map/ui/PlacementPin'
import { usePlacement } from '@/features/places/state/usePlacement'

/**
 * The fine-pointer surface: a real map marker at the draft point, draggable to
 * fine-tune after the click that created it.
 *
 * Unlike `PlaceMarkers`, this one does accept pointer events — a drag beginning
 * on it must move the pin, not pan the map.
 */
export function DraftMarker() {
  const { draft, setDraft } = usePlacement()

  if (!draft) {
    return null
  }

  const handleDrag = (event: MarkerDragEvent) => {
    // Through `toCoordinates`, never straight off the event — see the note
    // there on what an unwrapped longitude does.
    setDraft(toCoordinates(event.lngLat))
  }

  return (
    <Marker
      longitude={draft.lng}
      latitude={draft.lat}
      // The pin's tip is at its bottom edge, so the element hangs above the point.
      anchor="bottom"
      draggable
      // Updated throughout the drag, not only at its end: the confirm bar reads
      // the same draft, and figures that freeze mid-drag look broken.
      onDrag={handleDrag}
      onDragEnd={handleDrag}
    >
      <PlacementPin />
    </Marker>
  )
}
