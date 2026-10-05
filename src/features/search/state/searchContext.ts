import { createContext } from 'react'

import type { SearchResult } from '@/features/search/domain/SearchResult'

/**
 * 'idle' covers both "nothing typed" and "too short to ask about": in neither
 * case is an empty list an answer, so the panel must not report "no results"
 * under it.
 *
 * 'error' means we could not ask. It is a state of the search, never of the
 * map — the map stays exactly where it was and fully usable.
 */
export type SearchStatus = 'idle' | 'searching' | 'ready' | 'error'

export interface SearchContextValue {
  query: string
  /** Empty unless `status` is 'ready'. */
  results: SearchResult[]
  status: SearchStatus
  setQuery(query: string): void
  /** Back to an empty field and no results. Aborts anything in flight. */
  clear(): void
}

export const SearchContext = createContext<SearchContextValue | undefined>(undefined)
