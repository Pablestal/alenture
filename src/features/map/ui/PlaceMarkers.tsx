import { Marker } from 'react-map-gl/maplibre'

import { useVisiblePlaces } from '@/features/layers/hooks/useVisiblePlaces'
import { PlaceMarker } from '@/features/places/ui/PlaceMarker'
import { usePlaceEdit } from '@/features/places/state/usePlaceEdit'
import { usePlacement } from '@/features/places/state/usePlacement'
import { useSelection } from '@/features/places/state/useSelection'

/**
 * Every place, as a DOM marker.
 *
 * DOM rather than a symbol layer on purpose: the pins are styled with the same
 * tokens and Tailwind classes as the rest of the chrome, and now they are also
 * real buttons, which a symbol layer could not be. Whether that survives a few
 * hundred places is the question clustering answers later.
 *
 * While loading there are simply no markers — no spinner over the map, which
 * stays pannable throughout.
 */
export function PlaceMarkers() {
  /*
    The filtered list, not `usePlaces().places` — and the hook is what decides
    that, including the part where filters are suspended for the duration of a
    placement or an edit. Everything counting places still counts the whole
    list: the brand card's figures are what you have been to, not what is
    currently ticked.
  */
  const places = useVisiblePlaces()
  const { mode } = usePlacement()
  const { selectedId, select } = useSelection()
  const { placeId: editingId, draft: editDraft } = usePlaceEdit()

  // Existing places recede for the whole add flow, not only while the point is
  // being picked: the pin stays draggable behind the form, so it has to keep
  // standing out until the flow ends. They stop answering presses for the same
  // stretch — the user is mid-flow, and opening a detail panel over a
  // half-filled form is not what pressing a pin should be able to do.
  const isAdding = mode !== 'idle'
  /*
    An edit dims and freezes the others for the same reason a placement does:
    one pin is the point of the screen. It also stops a stray tap on a
    neighbouring marker from switching the selection out from under a form with
    unsaved work in it — the panel's own exits all ask first, and this is the
    one route that would not have.
  */
  const isEditing = editDraft !== null
  const isFlowActive = isAdding || isEditing

  return (
    <>
      {places.map((place) =>
        /*
          The place being edited has no marker here: `EditPinMarker` is drawing
          it, at the draft coordinates, and two pins for one place would be two
          answers to where it is.
        */
        place.id === editingId ? null : (
        <Marker
          key={place.id}
          longitude={place.lng}
          latitude={place.lat}
          // Bottom, not centre: the pin's tip is the coordinate.
          anchor="bottom"
          /*
            Pointer events ON, which is a reversal — these markers used to be
            transparent to the pointer so a drag beginning on one would still
            pan the map. It turns out that was not necessary: MapLibre appends
            marker elements to the map's own canvas container, which is where
            the drag handlers are bound, and a non-draggable marker never stops
            propagation. The map pans out from under a pressed pin either way.
            What that costs is a press that travels turning into a click at the
            end of the pan — which is what `useTapGesture` is for.

            Back to transparent for the length of a placement, and not by
            disabling the button: a disabled control receives no pointer events
            at all in Chrome and they do not bubble, so the map would stop
            panning under a pressed pin for exactly the stretch when the user is
            trying to position one. The button is disabled as well, for the tab
            order; this is what keeps the gesture reaching the map.
          */
          style={{
            opacity: isFlowActive ? 0.4 : 1,
            pointerEvents: isFlowActive ? 'none' : 'auto',
          }}
        >
          <PlaceMarker
            label={place.name}
            /*
              A selection survives a placement but does not show through one:
              its panel is hidden for the duration, and an accent pin left on
              the map at 40% would read as a second, faded placement pin. It
              comes back, colour and panel together, when the flow ends.
            */
            isSelected={!isFlowActive && place.id === selectedId}
            isInteractive={!isFlowActive}
            onSelect={() => select(place.id)}
          />
        </Marker>
        ),
      )}
    </>
  )
}
