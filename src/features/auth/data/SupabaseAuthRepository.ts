import type { User } from '@supabase/supabase-js'

import type { AuthRepository } from '@/features/auth/data/AuthRepository'
import type { AuthUser } from '@/features/auth/domain/AuthUser'
import { initialFor } from '@/features/auth/domain/AuthUser'
import { supabase } from '@/shared/lib/supabase'

/** The boundary: a Supabase `User` becomes our `AuthUser` here and nowhere else. */
function toAuthUser(user: User): AuthUser {
  const email = user.email ?? ''
  return { id: user.id, email, initial: initialFor(email) }
}

/**
 * Where the magic link comes back to. Origin plus path, deliberately without
 * query or fragment, so a link consumed at a URL that already carries a token
 * does not bake that token into the next redirect. This exact URL must be in the
 * project's redirect allow-list.
 */
function redirectUrl(): string {
  return window.location.origin + window.location.pathname
}

export const supabaseAuthRepository: AuthRepository = {
  onAuthStateChange(listener) {
    // Fires INITIAL_SESSION once the client has read storage and consumed any
    // token in the URL, so this is the only signal the provider needs.
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      listener(session ? toAuthUser(session.user) : null)
    })

    return () => {
      data.subscription.unsubscribe()
    }
  },

  async signInWithMagicLink(email) {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectUrl() },
    })
    if (error) {
      throw error
    }
  },

  async signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) {
      throw error
    }
  },
}
