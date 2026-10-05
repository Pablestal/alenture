import { createContext } from 'react'

import type { AuthUser } from '@/features/auth/domain/AuthUser'

export type AuthStatus = 'loading' | 'authenticated' | 'anonymous'

export interface AuthContextValue {
  /** Null unless `status` is 'authenticated'. */
  user: AuthUser | null
  status: AuthStatus
  signIn(email: string): Promise<void>
  signOut(): Promise<void>
}

/**
 * Undefined outside a provider, so `useAuth` can tell "no provider" apart from
 * "signed out" instead of silently rendering an anonymous UI.
 */
export const AuthContext = createContext<AuthContextValue | undefined>(undefined)
