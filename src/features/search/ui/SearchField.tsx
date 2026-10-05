import type { KeyboardEvent, RefObject } from 'react'
import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Search, X } from 'lucide-react'

import type { SearchResult } from '@/features/search/domain/SearchResult'
import { useFlyToResult } from '@/features/search/hooks/useFlyToResult'
import { useSearch } from '@/features/search/state/useSearch'
import { SearchResultsPanel } from '@/features/search/ui/SearchResultsPanel'

interface SearchFieldProps {
  /**
   * Leaving the search: the bar blurs, the overlay closes. Called on Escape and
   * after picking a result, so arriving somewhere always ends the search.
   */
  onDismiss(): void
  autoFocus?: boolean
  /** For surfaces that focus the field from outside — the `/` shortcut. */
  inputRef?: RefObject<HTMLInputElement | null>
}

/**
 * The input and its keyboard model. Both surfaces render this one component:
 * the bar and the overlay differ in where they sit, never in how they behave.
 */
export function SearchField({ onDismiss, autoFocus = false, inputRef }: SearchFieldProps) {
  const { t } = useTranslation('search')
  const { query, results, status, setQuery, clear } = useSearch()
  const flyToResult = useFlyToResult()
  const [activeIndex, setActiveIndex] = useState(-1)
  const fallbackRef = useRef<HTMLInputElement>(null)
  const ref = inputRef ?? fallbackRef
  const listboxId = useId()
  const optionId = useCallback((index: number) => `${listboxId}-option-${index}`, [listboxId])

  // A fresh list means a fresh highlight, on the first row: results arrive
  // ordered by relevance, so Enter without touching the arrows picks the best
  // match rather than nothing.
  useEffect(() => {
    setActiveIndex(results.length > 0 ? 0 : -1)
  }, [results])

  const select = useCallback(
    (result: SearchResult) => {
      flyToResult(result)
      // Nothing is written and nothing stays selected. The field empties so the
      // next search starts clean, and the map is left to the normal add flow.
      clear()
      onDismiss()
    },
    [flyToResult, clear, onDismiss],
  )

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Escape') {
        // One press leaves entirely, rather than emptying the field and leaving
        // an open panel over the map with no obvious way out.
        event.preventDefault()
        clear()
        onDismiss()
        return
      }

      if (results.length === 0) {
        return
      }

      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault()
        const step = event.key === 'ArrowDown' ? 1 : -1
        setActiveIndex((current) => {
          const next = current + step
          // Wraps: the list is short, and hitting a wall at either end tells
          // you nothing you did not already know.
          return (next + results.length) % results.length
        })
        return
      }

      if (event.key === 'Enter') {
        const result = results[activeIndex]
        if (!result) {
          return
        }
        event.preventDefault()
        select(result)
      }
    },
    [results, activeIndex, clear, onDismiss, select],
  )

  const hasOptions = status === 'ready' && results.length > 0

  return (
    <div>
      <div className="flex items-center gap-2 rounded-panel border border-border/60 bg-surface/85 px-3 backdrop-blur-md">
        <Search aria-hidden="true" focusable="false" className="size-4 shrink-0 text-text-muted" />
        <input
          ref={ref}
          type="text"
          role="combobox"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={handleKeyDown}
          autoFocus={autoFocus}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          aria-label={t('field.label')}
          placeholder={t('field.placeholder')}
          aria-expanded={hasOptions}
          aria-controls={hasOptions ? listboxId : undefined}
          aria-activedescendant={hasOptions && activeIndex >= 0 ? optionId(activeIndex) : undefined}
          className="h-11 min-w-0 flex-1 bg-transparent text-sm text-text outline-none placeholder:text-text-muted"
        />
        {query !== '' && (
          <button
            type="button"
            onClick={() => {
              clear()
              ref.current?.focus()
            }}
            aria-label={t('field.clear')}
            className="flex size-11 shrink-0 items-center justify-center rounded-full text-text-muted transition-colors hover:text-text active:bg-surface-raised"
          >
            <X aria-hidden="true" focusable="false" className="size-4" />
          </button>
        )}
      </div>

      <SearchResultsPanel
        results={results}
        status={status}
        activeIndex={activeIndex}
        listboxId={listboxId}
        optionId={optionId}
        onSelect={select}
        onActivate={setActiveIndex}
      />
    </div>
  )
}
