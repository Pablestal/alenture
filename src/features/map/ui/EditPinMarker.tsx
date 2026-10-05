import { Marker } from 'react-map-gl/maplibre'
import type { MarkerDragEvent } from 'react-map-gl/maplibre'

import { toCoordinates } from '@/features/map/toCoordinates'
import { PlacementPin } from '@/features/map/ui/PlacementPin'
import { usePlaceEdit } from '@/features/places/state/usePlaceEdit'

/**
 * The pin of a saved place while it is being edited: the same shape and the
 * same accent as the pin being placed, because it is the same gesture and the
 * same claim — this is the map object the screen is about.
 *
 * There is no centre-pin variant of this, on either surface. Placement uses one
 * because there is no position yet and the map's own movement is the input;
 * here the place already has a position, and the thing being expressed is "not
 * there, THERE", which is a drag. Recentring the map to fake the placement
 * gesture would also throw away the user's view of where the pin currently is,
 * which is the only thing they can judge the move against.
 *
 * On a coarse pointer the sheet covers most of the map, which is a problem
 * about the sheet and is solved by the sheet stepping aside — see the move step
 * in `PlaceDetailContainer`. It is not a reason to change the gesture.
 */
export function EditPinMarker() {
  const { draft, patch, settlePin } = usePlaceEdit()

  if (!draft) {
    return null
  }

  const handleDrag = (event: MarkerDragEvent) => {
    // Through `toCoordinates`, never straight off the event — see the note
    // there on what an unwrapped longitude does.
    patch({ coordinates: toCoordinates(event.lngLat) })
  }

  return (
    <Marker
      longitude={draft.coordinates.lng}
      latitude={draft.coordinates.lat}
      // The pin's tip is at its bottom edge, so the element hangs above the point.
      anchor="bottom"
      draggable
      // Updated throughout the drag, not only at its end: the panel shows these
      // coordinates, and figures that freeze mid-drag look broken.
      onDrag={handleDrag}
      onDragEnd={(event: MarkerDragEvent) => {
        handleDrag(event)
        // Only here, never during the drag. This is what a suggestion lookup
        // keys on, and asking mid-drag would name a city the pin is still
        // moving away from.
        settlePin(toCoordinates(event.lngLat))
      }}
    >
      <div className="relative">
        <PlacementPin />
        {/*
          A 44px touch target over a 34px drawing, and it is not decoration to
          be tidied away in review: the pin being visible is not the same as the
          pin being grabbable, and every interaction here has to work with a
          finger on it. Absolutely positioned so it enlarges what can be
          pressed without enlarging the element's box — the box is what the
          marker anchors by, so padding here would silently lift the tip off the
          coordinate it claims to mark.

          Centred on the disc rather than on the whole shape, because the disc
          is what people aim at; the tail is a pointer, not a handle.
        */}
        <span
          aria-hidden="true"
          className="absolute left-1/2 top-[17px] size-11 -translate-x-1/2 -translate-y-1/2"
        />
      </div>
    </Marker>
  )
}
