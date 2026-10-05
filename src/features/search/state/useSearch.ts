import { use } from 'react'

import type { SearchContextValue } from '@/features/search/state/searchContext'
import { SearchContext } from '@/features/search/state/searchContext'

export function useSearch(): SearchContextValue {
  const value = use(SearchContext)
  if (!value) {
    throw new Error('useSearch must be used inside a SearchProvider')
  }
  return value
}
