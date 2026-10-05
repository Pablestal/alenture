import type { NewPlace, Place, PlacePatch, PlaceWithStats } from '@/features/places/domain/Place'

/**
 * Every read and write of places goes through here. The Supabase implementation
 * is the only one today; a local SQLite one follows when the app is packaged.
 *
 * All methods throw `RepositoryError` on failure. An empty result is not a
 * failure: RLS hiding everything and owning nothing are the same empty list.
 */
export interface PlacesRepository {
  /**
   * Every place that still exists, with its visit figures. Never includes
   * deleted places.
   */
  list(): Promise<PlaceWithStats[]>

  /** Null when there is no such place, or it is deleted, or it is not yours. */
  getById(id: string): Promise<Place | null>

  /** Mints the id and returns the stored place. */
  create(place: NewPlace): Promise<Place>

  /** Throws 'not-found' if the place is already deleted or was never there. */
  update(id: string, patch: PlacePatch): Promise<Place>

  /** Soft delete: marks the row deleted, never removes it. */
  remove(id: string): Promise<void>
}
