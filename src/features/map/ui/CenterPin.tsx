import { PlacementPin } from '@/features/map/ui/PlacementPin'

/**
 * The coarse-pointer surface: the pin is pinned to the screen and the map moves
 * underneath it. It never shifts relative to the viewport, so the coordinates
 * come from the map centre on `moveend`, never from this element.
 *
 * `pointer-events-none` applies to THIS pin only, and must stay on this element
 * rather than being hoisted to a wrapper: the confirm bar renders in the same
 * chrome layer and has to stay tappable while the map is being dragged beneath
 * it. Moving this class up a level is how that gets silently broken.
 */
export function CenterPin() {
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
      {/*
        This pin is centred in the viewport, not anchored to a coordinate, so
        the `anchor="bottom"` the map markers use does not apply — the offset has
        to be made here. Half the pin's own height puts the tip, rather than the
        middle, on the centre of the viewport, which is the point the map
        reports on `moveend`.

        Expressed as a fraction of the element rather than in pixels so it
        follows `PIN_HEIGHT` instead of drifting the next time the shape is
        adjusted.
      */}
      <div className="-translate-y-1/2">
        <PlacementPin />
      </div>
    </div>
  )
}
