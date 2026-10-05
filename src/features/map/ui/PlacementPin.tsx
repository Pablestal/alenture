import { PinShape } from '@/shared/ui/PinShape'

/**
 * The pin being placed. It carries the accent as the map object the current
 * context is about — unselected saved markers stay on the surface tokens, and
 * the form's save button is the accented action beside it.
 *
 * The same shape as a saved marker, differing only in fill: placement is a
 * promise about what the marker will be, so it cannot be a different object.
 *
 * The accent is opaque, where the saved fill is 85%. This is the one thing on
 * screen that should read as in progress and definite — translucency over a
 * moving map reads as tentative.
 *
 * Shared by both surfaces so a dragged pin and a fixed centre pin are visibly
 * the same object. The tip sits at the bottom of the element, which is what lets
 * either caller put it on the real point.
 */
export function PlacementPin() {
  return (
    // Stroked in the surface colour, not a light ring: the accent needs holding
    // off the map underneath it, and a dark outline does that at any zoom.
    <PinShape fill="fill-accent" stroke="stroke-surface" strokeWidth={2} className="drop-shadow-lg" />
  )
}
