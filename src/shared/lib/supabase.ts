import { createClient } from '@supabase/supabase-js'

import { requireEnv } from '@/shared/lib/env'
import { createStorage } from '@/shared/lib/storage'
import type { Database } from '@/types/database'

/**
 * The one Supabase client. The anon key is public by design — RLS is what
 * protects the data.
 */
export const supabase = createClient<Database>(
  requireEnv('VITE_SUPABASE_URL'),
  requireEnv('VITE_SUPABASE_ANON_KEY'),
  {
    auth: {
      // Session goes through our storage door, not straight to localStorage,
      // so the Capacitor backend swaps in without touching this file.
      storage: createStorage('auth'),
      storageKey: 'session',
      persistSession: true,
      autoRefreshToken: true,
      // Required: the magic link lands back here carrying its token in the URL,
      // and this is what consumes it. The app must survive that first render.
      detectSessionInUrl: true,
    },
  },
)
