import type { AuthUser } from '@/features/auth/domain/AuthUser'

/**
 * Everything the app needs from an auth backend. The Supabase implementation is
 * the only one today; Capacitor will want a second one, because the magic-link
 * redirect leaves the browser and comes back through a custom scheme.
 *
 * No session or token appears here. supabase-js attaches the token to its own
 * requests, so nothing above this layer has a use for it.
 */
export interface AuthRepository {
  /**
   * Subscribes to identity changes. The listener is called once with the
   * initial state — signed in or not — as soon as it is known, which is what
   * lets the UI leave its loading state exactly once.
   *
   * Returns the unsubscribe function.
   */
  onAuthStateChange(listener: (user: AuthUser | null) => void): () => void

  /** Sends a sign-in link. Rejects if the mail could not be dispatched. */
  signInWithMagicLink(email: string): Promise<void>

  signOut(): Promise<void>
}
