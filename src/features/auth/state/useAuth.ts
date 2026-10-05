import { use } from 'react'

import type { AuthContextValue } from '@/features/auth/state/authContext'
import { AuthContext } from '@/features/auth/state/authContext'

export function useAuth(): AuthContextValue {
  const value = use(AuthContext)
  if (!value) {
    throw new Error('useAuth must be used inside an AuthProvider')
  }
  return value
}
