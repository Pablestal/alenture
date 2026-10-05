import 'maplibre-gl/dist/maplibre-gl.css'

import { useCallback, useEffect, useRef } from 'react'
import { Map } from 'react-map-gl/maplibre'
import type { MapLayerMouseEvent, MapRef } from 'react-map-gl/maplibre'
import { useTranslation } from 'react-i18next'

import { useMapView } from '@/features/layers/state/useMapView'
import { MAIN_MAP_ID } from '@/features/map/mapId'
import { toCoordinates } from '@/features/map/toCoordinates'
import { DraftMarker } from '@/features/map/ui/DraftMarker'
import { EditPinMarker } from '@/features/map/ui/EditPinMarker'
import { PlaceMarkers } from '@/features/map/ui/PlaceMarkers'
import { usePlaceEdit } from '@/features/places/state/usePlaceEdit'
import { usePlacement } from '@/features/places/state/usePlacement'
import { useSelection } from '@/features/places/state/useSelection'
import { useIsFinePointer } from '@/shared/lib/useIsFinePointer'

/** Kept in step with the panel in `PlaceFormContainer` and the chrome inset. */
const PANEL_WIDTH = 400
const PANEL_MARGIN = 24

const INITIAL_VIEW_STATE = {
  // Roughly centred on Europe.
  longitude: 10,
  latitude: 50,
  zoom: 4,
} as const

export function MapCanvas() {
  const { t } = useTranslation('map')
  /*
    The basemap the layers panel has chosen. Not read from env here any more:
    there are two style URLs now and the choice between them is state, which
    means it belongs to a provider rather than to this component. MapLibre swaps
    the style in place, and the markers are DOM children of the container rather
    than layers in the style, so they survive the swap untouched.
  */
  const { mapStyleUrl } = useMapView()
  const mapRef = useRef<MapRef>(null)
  const { mode, setDraft } = usePlacement()
  const { clear } = useSelection()
  const { draft: editDraft } = usePlaceEdit()
  const isFinePointer = useIsFinePointer()

  const isPlacing = mode === 'placing'
  const isEditing = mode === 'editing'
  // The pin is live through both steps: it is placed under 'placing' and stays
  // draggable under 'editing', with the form reading the coordinates as it moves.
  const isPinLive = isPlacing || isEditing
  const usesCenterPin = isPlacing && !isFinePointer

  useEffect(() => {
    if (!usesCenterPin) {
      return
    }
    const map = mapRef.current
    if (!map) {
      return
    }
    // Read from the live map, not `INITIAL_VIEW_STATE`: placement usually starts
    // after the user has panned somewhere, and seeding from the initial view
    // would drop the pin on a different continent.
    setDraft(toCoordinates(map.getCenter()))
  }, [usesCenterPin, setDraft])

  const handleMoveEnd = useCallback(() => {
    if (!usesCenterPin) {
      return
    }
    const map = mapRef.current
    if (!map) {
      return
    }
    setDraft(toCoordinates(map.getCenter()))
  }, [usesCenterPin, setDraft])

  useEffect(() => {
    const map = mapRef.current
    if (!map) {
      return
    }

    // The form panel covers the right-hand 400px plus its 24px margins. Told to
    // MapLibre as padding rather than by shrinking the container: the map keeps
    // the full viewport, so the coordinates under the cursor stay the real ones
    // and only what counts as "centred" moves.
    if (!isEditing || !isFinePointer) {
      map.easeTo({ padding: { top: 0, right: 0, bottom: 0, left: 0 }, duration: 200 })
      return
    }

    map.easeTo({
      padding: { top: 0, right: PANEL_WIDTH + PANEL_MARGIN * 2, bottom: 0, left: 0 },
      duration: 200,
    })
    // Deliberately not re-run when the draft moves: re-centring on every drag
    // would pull the map out from under the pin being dragged.
  }, [isEditing, isFinePointer])

  const handleClick = useCallback(
    (event: MapLayerMouseEvent) => {
      /*
        A click on a marker arrives here too. MapLibre binds its handlers to the
        canvas container, markers are children of it, and the event bubbles — so
        the map's own click fires for a press on a pin, and fires BEFORE React
        delivers the pin's. Without this line, selecting a marker would clear the
        selection a moment later and the panel would never open.

        Read off the DOM rather than inferred from state: `maplibregl-marker` is
        the class MapLibre puts on every marker element itself, so this stays
        true for markers we have not written yet.
      */
      const target = event.originalEvent.target
      if (target instanceof Element && target.closest('.maplibregl-marker')) {
        return
      }

      if (isPlacing) {
        // Click-to-place is a fine-pointer gesture only. On touch, a tap is too
        // easy to trigger while panning, and the centre pin already owns the point.
        if (isFinePointer) {
          // Through `toCoordinates`, never straight off the event — see the
          // note there on what an unwrapped longitude does.
          setDraft(toCoordinates(event.lngLat))
        }
        return
      }

      /*
        Not while an edit is open. A click on the map used to close the panel
        outright — which, once the panel could hold a half-typed name and a
        dragged pin, meant the map discarded unsaved work with no prompt and no
        way back. It was reachable before this milestone and is on the common
        path now: the pin being dragged is out here, and a drag that ends as a
        click is one finger-slip away.

        Ignored rather than prompted: the map is where the pin is being moved,
        and a question every time a drag ends slightly off the pin would be
        worse than the panel simply staying put. The ways out of an edit are the
        ones inside the panel, and they all ask.
      */
      if (editDraft) {
        return
      }

      // The map itself is how you put the panel away, alongside Escape and the
      // close button. Nothing to lose by doing it: a detail panel holds no work.
      clear()
    },
    [isPlacing, isFinePointer, setDraft, clear, editDraft],
  )

  return (
    <Map
      ref={mapRef}
      /*
        Registers the instance with the surrounding MapProvider. `mapRef` is
        this component's own handle; the id is how everything else reaches the
        map — see `useFlyToResult`.
      */
      id={MAIN_MAP_ID}
      initialViewState={INITIAL_VIEW_STATE}
      mapStyle={mapStyleUrl}
      style={{ width: '100%', height: '100%' }}
      aria-label={t('canvas.label')}
      // This is a marker map, not a navigation app: rotation and pitch are locked
      // because an accidental two-finger twist on mobile has no easy recovery.
      dragRotate={false}
      touchPitch={false}
      pitchWithRotate={false}
      /*
        MapLibre's native controls stay off, and this one has to stay off for a
        reason beyond styling: the native attribution control is the only thing
        that calls the sanitizer GHSA-jrc7-96c5-q579 reports as bypassable. The
        ODbL credit is ours now and lives in the chrome layer — see
        `MapAttribution`, which carries the detail.
      */
      attributionControl={false}
      // Kept for the whole fine-pointer session, not just before the first click:
      // a further click re-places the pin, so the affordance is still true.
      cursor={isPlacing && isFinePointer ? 'crosshair' : undefined}
      onClick={handleClick}
      onMoveEnd={handleMoveEnd}
    >
      <PlaceMarkers />

      {/*
        The coarse-pointer pin is NOT here: it belongs to the screen, not to the
        map, so it renders in the chrome layer instead.
      */}
      {isPinLive && isFinePointer && <DraftMarker />}

      {/*
        The pin of the place being edited, on both surfaces. Unlike placement
        there is no centre-pin variant: the place already has a position, so the
        gesture is a drag rather than a map move. See `EditPinMarker`.
      */}
      <EditPinMarker />
    </Map>
  )
}
