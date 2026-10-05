import { createContext } from 'react'

import type { PlaceWithStats } from '@/features/places/domain/Place'
import type { PlaceDraft } from '@/features/places/domain/placeDraft'

/**
 * How much of an edit landed.
 *
 * 'saved-without-date' is not an error and must not be thrown: the place itself
 * saved, and the name the user typed is in the database. It says the visit
 * write failed after it, so the date on screen is the old one again.
 *
 * The delete path swallows the same failure silently, and the difference is
 * deliberate: nothing displays a deleted place's visits, and this panel
 * displays the date. Reporting it is the only way the field and the database
 * agree about what happened.
 */
export type PlaceUpdateOutcome = 'saved' | 'saved-without-date'

/**
 * 'idle' is the signed-out resting state, not a pre-load one. It is what the
 * UI shows when there is nobody to have places, so an empty list under 'idle'
 * must never be read as "you have no places yet".
 */
export type PlacesStatus = 'idle' | 'loading' | 'ready' | 'error'

export interface PlacesContextValue {
  /** Empty unless `status` is 'ready'. */
  places: PlaceWithStats[]
  status: PlacesStatus
  /** Re-runs the load. A no-op while signed out — there is nothing to fetch. */
  refresh(): void
  /**
   * Writes a place, and a visit when the draft carries a date. Both or neither:
   * a failed visit takes the place with it.
   *
   * The marker appears before the request finishes and is withdrawn if it
   * fails. Rejects with the `RepositoryError` so the form can say what went
   * wrong — the rollback has already happened by then.
   */
  createPlace(draft: PlaceDraft): Promise<PlaceWithStats>
  /**
   * Soft-deletes a place and, with it, every visit that pointed at it.
   *
   * The marker goes immediately and comes back — in its old position in the
   * list — if the place delete fails. Rejects with the `RepositoryError` in
   * that case, so the panel can say what went wrong.
   *
   * If the place is deleted and only the visit sweep fails, this RESOLVES. The
   * place stays deleted and the orphaned visits are logged: nothing reads them
   * today, and a place the user watched disappear reappearing under a red
   * message is a worse thing to have happened than rows a future timeline will
   * have to tidy.
   */
  deletePlace(id: string): Promise<void>
  /**
   * Saves an edited place, and whatever the date now implies for its visits.
   *
   * The list is updated before the request goes out — the marker's label comes
   * from here, so an optimistic panel alone would leave the pin announcing the
   * old name — and reverted if the place write fails, which is when this
   * rejects with the `RepositoryError`.
   *
   * Takes a draft, not a patch: the caller has a form, and which of the two
   * tables each field belongs to is this provider's problem, not the form's.
   */
  updatePlace(id: string, draft: PlaceDraft): Promise<PlaceUpdateOutcome>
  /**
   * Drops a deleted layer's id from every place holding it. Local state only —
   * the database has already done its half inside `delete_layer`, atomically
   * with the delete itself.
   *
   * Called by whoever deleted the layer, and only after it succeeded. It is not
   * `LayersProvider`'s job: that provider does not know the places, and handing
   * it them so it could run one map would merge the two lists to save a call.
   *
   * Not merely cosmetic. `buildLayerIndex` already files a place with an
   * unknown layer under Unassigned, so the panel would look right without this
   * — but the id would still be sitting in the draft the next edit starts from,
   * and `toPlacePatch` would write it back to a layer that no longer exists.
   */
  unassignLayer(layerId: string): void
}

/**
 * Undefined outside a provider, so `usePlaces` can tell "no provider" apart
 * from "no places", which otherwise both look like an empty list.
 */
export const PlacesContext = createContext<PlacesContextValue | undefined>(undefined)
