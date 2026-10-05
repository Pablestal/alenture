import type { NewVisit, Visit, VisitPatch } from '@/features/places/domain/Visit'

/**
 * Reads and writes of visits.
 *
 * Throws `RepositoryError`, same as `PlacesRepository`. A 'not-found' from
 * `create` means the place is gone or was never yours: the composite foreign
 * key `(place_id, user_id)` makes attaching a visit to someone else's place
 * impossible at the database, not merely discouraged.
 */
export interface VisitsRepository {
  /**
   * Every live visit of one place, oldest first.
   *
   * Plural and ordered, though the only caller today wants one of them: the
   * schema allows N visits per place, and "the one the form is editing" is a
   * statement about there being one form — which is knowledge this layer does
   * not have and should not acquire. The timeline reads this method as it
   * stands.
   *
   * An empty list for a place with no visits, never 'not-found'.
   */
  listByPlace(placeId: string): Promise<Visit[]>

  /** Mints the id and returns the stored visit. */
  create(visit: NewVisit): Promise<Visit>

  /** Throws 'not-found' if the visit is already deleted or was never there. */
  update(id: string, patch: VisitPatch): Promise<Visit>

  /**
   * Soft-deletes every live visit of a place. Deleting a place has to call
   * this: the foreign key is `on delete cascade`, and a soft delete is an
   * update, so nothing cascades. Without it the visits outlive the place they
   * point at — invisible today, wrong the moment a timeline reads them.
   *
   * Also how a date is cleared from the form: "been here, don't remember when"
   * is a place with no visits.
   *
   * A place with no visits is the ordinary case, so zero rows is success and
   * never 'not-found'.
   */
  removeByPlace(placeId: string): Promise<void>
}
