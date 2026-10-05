import { createContext } from 'react'

import type { Layer } from '@/features/layers/domain/Layer'

/**
 * 'idle' is the signed-out resting state, not a pre-load one. It is what the UI
 * shows when there is nobody to have layers, so an empty list under 'idle' must
 * never be read as "you have not made any layers yet".
 *
 * Mirrors `PlacesStatus` deliberately: the two lists load off the same auth
 * transition and the panel shows them together, so a second vocabulary for the
 * same four states would only be somewhere for them to disagree.
 */
export type LayersStatus = 'idle' | 'loading' | 'ready' | 'error'

/** Which way an arrow moves a layer in the user's order. */
export type LayerDirection = 'up' | 'down'

/**
 * The user's own organising scheme: the layers they made, and the four things
 * that can be done to them.
 *
 * Separate from `MapViewContext`, which holds which layers are currently
 * TICKED. That is the same split as `PlacesProvider` against the lens, and for
 * the same reason: this list is a record that survives a reload, and which rows
 * are ticked is a lens held up to it that does not. Merged, the provider that
 * writes to the database would also own which checkboxes are on, and every
 * toggle would re-render everything holding the list.
 */
export interface LayersContextValue {
  /** In the user's order. Empty unless `status` is 'ready'. */
  layers: Layer[]
  status: LayersStatus
  /** Re-runs the load. A no-op while signed out — there is nothing to fetch. */
  refresh(): void
  /**
   * Creates a layer at the end of the list. Takes the name only; `sort` is this
   * provider's business, because it is the thing holding the list to count.
   *
   * The row appears before the request finishes and is withdrawn if it fails.
   * Rejects with the `RepositoryError` so the panel can say what went wrong.
   */
  createLayer(name: string): Promise<Layer>
  /** Renames in place, optimistically. Rejects with the `RepositoryError`. */
  renameLayer(id: string, name: string): Promise<void>
  /**
   * Swaps the layer with its neighbour in that direction. A no-op at the ends
   * of the list, which is also what the arrows look like there — disabled.
   *
   * Two writes, and they are not atomic: a failure between them leaves two
   * layers sharing a `sort`, which `sortLayers` breaks by `createdAt` so the
   * order is wrong rather than unstable. Pressing the arrow again fixes it.
   * That trade-off was chosen rather than overlooked — `LayersProvider` gives
   * the reasoning, and why it differs from the one `delete_layer` makes.
   */
  moveLayer(id: string, direction: LayerDirection): Promise<void>
  /**
   * Soft-deletes the layer. Its places are unassigned, never deleted — the
   * repository does both in one statement, and the confirmation the user
   * answered has to have said so.
   *
   * The caller is responsible for telling `PlacesProvider` afterwards, via
   * `unassignLayer`. This provider does not know the places, and giving it them
   * so it could run one update would be the merge the split above exists to
   * avoid.
   */
  deleteLayer(id: string): Promise<void>
}

/**
 * Undefined outside a provider, so `useLayers` can tell "no provider" apart
 * from "no layers", which otherwise both look like an empty list.
 */
export const LayersContext = createContext<LayersContextValue | undefined>(undefined)
