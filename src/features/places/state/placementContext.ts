import { createContext } from 'react'

import type { Coordinates } from '@/features/places/domain/coordinates'
import type { ReverseResult } from '@/features/search/domain/ReverseResult'

/**
 * Two steps, not one: 'placing' picks the point, 'editing' fills in the form.
 * The pin stays live through both — it is still draggable while the form is
 * open, which is why 'editing' is a placement mode and not a separate flow.
 */
export type PlacementMode = 'idle' | 'placing' | 'editing'

/**
 * What the geocoder has been asked, and what it said.
 *
 * 'done' with a null result covers both "there is no city there" and "we could
 * not ask": the form treats them identically, because a prefill that did not
 * happen is not something to report either way. Only a caller that wanted to
 * distinguish them would need more states, and none does.
 */
export interface PlacementDetection {
  status: 'idle' | 'detecting' | 'done'
  result: ReverseResult | null
}

export interface PlacementContextValue {
  mode: PlacementMode
  /**
   * Null under 'idle', and also under 'placing' before a point exists — on a
   * fine pointer that is every moment before the first click. A null draft is
   * why Confirm can be disabled while placing.
   */
  draft: Coordinates | null
  /** Enters placement with no draft. Whoever knows where the map is seeds it. */
  start(): void
  /** Moves the draft point. Also the seeding call. */
  setDraft(coordinates: Coordinates): void
  /**
   * What is at the confirmed point, once it has been asked for. Reset to idle
   * whenever placement leaves 'editing', so a previous attempt's answer can
   * never prefill the next form.
   *
   * The provider does not decide what to do with this. Whether the answer is
   * still wanted depends on whether the user has typed since, and only the form
   * knows that.
   */
  detection: PlacementDetection
  /** Back to idle, discarding the draft. Escape and the close button both land here. */
  cancel(): void
  /**
   * 'placing' → 'editing'. A no-op without a draft, so it is safe to wire to a
   * button that may be disabled.
   */
  confirm(): void
}

/**
 * Undefined outside a provider, so `usePlacement` can tell "no provider" apart
 * from "not placing" — which otherwise both look like an idle mode.
 */
export const PlacementContext = createContext<PlacementContextValue | undefined>(undefined)
