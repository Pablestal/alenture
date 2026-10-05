import type { Layer, LayerPatch, NewLayer } from '@/features/layers/domain/Layer'

/**
 * Every read and write of layers goes through here. The Supabase implementation
 * is the only one today; a local SQLite one follows when the app is packaged.
 *
 * All methods throw `RepositoryError` on failure — the same one `PlacesRepository`
 * throws, from `features/places/data`. It is shared rather than duplicated: a
 * caller catching a failed write should not have to know which feature's error
 * class it caught. If a third feature needs it, it moves to `shared/lib`.
 *
 * An empty result is not a failure: RLS hiding everything and owning nothing are
 * the same empty list.
 */
export interface LayersRepository {
  /** Every layer that still exists, in the user's own order. */
  list(): Promise<Layer[]>

  /** Mints the id and returns the stored layer. */
  create(layer: NewLayer): Promise<Layer>

  /** Throws 'not-found' if the layer is already deleted or was never there. */
  update(id: string, patch: LayerPatch): Promise<Layer>

  /**
   * Soft-deletes the layer AND unassigns its places. Both, atomically, or
   * neither — which is why this is one call and not two.
   *
   * Deleting a layer never deletes a place. The places survive with no layer,
   * and the confirmation the user answers has to say so in as many words.
   *
   * Throws 'not-found' if the layer is already deleted or was never there.
   */
  remove(id: string): Promise<void>
}
