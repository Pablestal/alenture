import { RepositoryError } from '@/features/places/data/RepositoryError'

/**
 * Literals, for the same reason as `PlaceDraftErrorKey`: so a key renamed in
 * the locale file becomes a compile error rather than a blank line on screen.
 */
export type SaveErrorKey = 'form.errors.saveFailed' | 'form.errors.saveUnauthenticated'

/**
 * Repository failures as i18n keys. No form ever shows a raw error message.
 *
 * Shared by the add form and the detail panel's edit mode. The same two things
 * go wrong when a place is written, and they should not become two vocabularies
 * depending on which panel the user is standing in.
 */
export function toSaveErrorKey(error: unknown): SaveErrorKey {
  if (error instanceof RepositoryError && error.kind === 'unauthenticated') {
    return 'form.errors.saveUnauthenticated'
  }
  return 'form.errors.saveFailed'
}
