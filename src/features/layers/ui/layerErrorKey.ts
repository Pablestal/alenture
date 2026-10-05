import { RepositoryError } from '@/features/places/data/RepositoryError'

/**
 * Literals, for the same reason as `SaveErrorKey`: a key renamed in the locale
 * file becomes a compile error rather than a blank line on screen.
 */
export type LayerErrorKey = 'manage.errors.failed' | 'manage.errors.failedUnauthenticated'

/**
 * Repository failures as i18n keys. The panel never shows a raw error message.
 *
 * Shared by creating, renaming, reordering and deleting. The same two things go
 * wrong for all four, and one vocabulary is what stops "your session has
 * expired" from being worded three ways in one panel.
 */
export function toLayerErrorKey(error: unknown): LayerErrorKey {
  if (error instanceof RepositoryError && error.kind === 'unauthenticated') {
    // Worth telling apart: "that did not work" on an expired session is a dead
    // end, and signing in again is the way out of it.
    return 'manage.errors.failedUnauthenticated'
  }
  return 'manage.errors.failed'
}
