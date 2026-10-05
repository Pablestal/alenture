import { createContext } from 'react'

import type { Coordinates } from '@/features/places/domain/coordinates'
import type { PlaceWithStats } from '@/features/places/domain/Place'
import type { PlaceDraft } from '@/features/places/domain/placeDraft'

/**
 * The draft of a saved place being edited, and where its pin currently is.
 *
 * It is a provider rather than state inside the panel because the pin is on the
 * map and the form is in a panel, and they are editing the same thing. Two
 * copies of a coordinate — one in the form, one under the marker — is a race
 * waiting to be written: whichever of them saves is whichever rendered last.
 *
 * Deliberately NOT part of `PlacementContext`, though the shape is close.
 * Placement's draft is a bare coordinate with no record behind it, its modes
 * describe a flow that ends in a create, and its geocoder lookup fires on
 * confirm. Editing has a whole draft, a place id, and a lookup that fires only
 * when a pin comes to rest a long way from where it started. Sharing the type
 * would mean one set of transitions answering to both, and every question about
 * one of them would have to be answered for the other.
 *
 * What stays out: errors, saving, prompts. Those belong to the panel — nothing
 * on the map has an opinion about a validation message.
 */
export interface PlaceEditContextValue {
  /** The place being edited, or null when nothing is. */
  placeId: string | null
  /** The live draft, moving as the pin is dragged and as fields are typed. */
  draft: PlaceDraft | null
  /**
   * Where the pin was when editing began. The distance the suggestion is
   * measured against, and never overwritten while the edit runs — measuring
   * from the last resting point instead would let a long move creep past the
   * threshold in short hops without ever tripping it.
   */
  origin: Coordinates | null
  /**
   * The last point the pin came to rest at, updated when a drag ends rather
   * than while it runs. What the suggestion lookup keys on: asking mid-drag
   * would name a city the user is still dragging away from.
   */
  settledAt: Coordinates | null
  /**
   * True on a coarse pointer while the sheet is out of the way and the map has
   * the screen. Always false on a fine pointer, where the pin is dragged with
   * the panel in place and there is nothing to step out of.
   */
  isMovingPin: boolean
  start(place: PlaceWithStats): void
  patch(patch: Partial<PlaceDraft>): void
  /** The pin has been let go. Records where, which is what may trigger a lookup. */
  settlePin(coordinates: Coordinates): void
  startMovingPin(): void
  stopMovingPin(): void
  /** Ends the edit and discards the draft. Saving and cancelling both land here. */
  stop(): void
}

/**
 * Undefined outside a provider, so `usePlaceEdit` can tell "no provider" apart
 * from "not editing" — which otherwise both look like a null draft.
 */
export const PlaceEditContext = createContext<PlaceEditContextValue | undefined>(undefined)
