import type { ReactNode } from 'react'
import { useEffect, useMemo, useState } from 'react'

import type { AuthRepository } from '@/features/auth/data/AuthRepository'
import { supabaseAuthRepository } from '@/features/auth/data/SupabaseAuthRepository'
import type { AuthUser } from '@/features/auth/domain/AuthUser'
import type { AuthContextValue, AuthStatus } from '@/features/auth/state/authContext'
import { AuthContext } from '@/features/auth/state/authContext'

interface AuthProviderProps {
  children: ReactNode
  /** Overridable so a different backend can be swapped in without a rewrite. */
  repository?: AuthRepository
}

export function AuthProvider({ children, repository = supabaseAuthRepository }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [status, setStatus] = useState<AuthStatus>('loading')

  useEffect(() => {
    // The subscription is the single source of truth: its first callback tells
    // us whether a stored session exists or a token in the URL just became one.
    // Until then `status` stays 'loading' and the UI shows neither state.
    const unsubscribe = repository.onAuthStateChange((nextUser) => {
      setUser(nextUser)
      setStatus(nextUser ? 'authenticated' : 'anonymous')
    })

    return unsubscribe
  }, [repository])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      status,
      signIn: (email) => repository.signInWithMagicLink(email),
      signOut: () => repository.signOut(),
    }),
    [user, status, repository],
  )

  return <AuthContext value={value}>{children}</AuthContext>
}
