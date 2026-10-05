import type { ReactNode } from 'react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { GeocodingRepository } from '@/features/search/data/GeocodingRepository'
import type { SearchResult } from '@/features/search/domain/SearchResult'
import { isSearchable, normalizeQuery } from '@/features/search/domain/searchQuery'
import type { SearchContextValue, SearchStatus } from '@/features/search/state/searchContext'
import { SearchContext } from '@/features/search/state/searchContext'

/**
 * Long enough that typing a city name is one request rather than eight, short
 * enough that the list feels like it is keeping up.
 */
const DEBOUNCE_MS = 300

interface SearchProviderProps {
  children: ReactNode
  /**
   * Required, and never defaulted to Photon: this module must stay ignorant of
   * which geocoder it is talking to. `AppProviders` owns the choice.
   */
  repository: GeocodingRepository
}

export function SearchProvider({ children, repository }: SearchProviderProps) {
  const { i18n } = useTranslation()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [status, setStatus] = useState<SearchStatus>('idle')
  const language = i18n.language

  useEffect(() => {
    const trimmed = normalizeQuery(query)
    if (!isSearchable(trimmed)) {
      setResults([])
      setStatus('idle')
      return
    }

    // Said before the debounce, not after it: from the moment a searchable
    // query exists the panel is waiting on us, and the previous query's results
    // are already stale.
    setStatus('searching')

    const controller = new AbortController()
    const timer = setTimeout(() => {
      void repository
        .search(trimmed, { signal: controller.signal, lang: language })
        .then((next) => {
          // The cleanup below aborts on every keystroke, so an aborted signal
          // is exactly "a newer query owns the panel now". Last request wins,
          // and an out-of-order response can never overwrite a newer one.
          if (controller.signal.aborted) {
            return
          }
          setResults(next)
          setStatus('ready')
        })
        .catch(() => {
          if (controller.signal.aborted) {
            return
          }
          // Quietly: the panel says it could not search, and nothing else in
          // the app changes. The map was never involved.
          setResults([])
          setStatus('error')
        })
    }, DEBOUNCE_MS)

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [query, language, repository])

  const clear = useCallback(() => {
    setQuery('')
  }, [])

  const value = useMemo<SearchContextValue>(
    () => ({ query, results, status, setQuery, clear }),
    [query, results, status, clear],
  )

  return <SearchContext value={value}>{children}</SearchContext>
}
