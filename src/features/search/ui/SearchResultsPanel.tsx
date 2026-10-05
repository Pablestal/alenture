import { useTranslation } from 'react-i18next'

import type { SearchResult } from '@/features/search/domain/SearchResult'
import type { SearchStatus } from '@/features/search/state/searchContext'

interface SearchResultsPanelProps {
  results: SearchResult[]
  status: SearchStatus
  /** Index of the keyboard-highlighted row, or -1 when none is. */
  activeIndex: number
  listboxId: string
  optionId(index: number): string
  onSelect(result: SearchResult): void
  onActivate(index: number): void
}

/**
 * The list under the field, plus the two states that are not a list. Rendered
 * only when there is something to say — 'idle' produces nothing at all, because
 * an empty list is not an answer to a query nobody has finished typing.
 */
export function SearchResultsPanel({
  results,
  status,
  activeIndex,
  listboxId,
  optionId,
  onSelect,
  onActivate,
}: SearchResultsPanelProps) {
  const { t } = useTranslation('search')

  if (status === 'idle') {
    return null
  }

  const isEmpty = status === 'ready' && results.length === 0

  return (
    <div className="mt-2 overflow-hidden rounded-panel border border-border/60 bg-surface/85 backdrop-blur-md">
      {status === 'searching' && (
        <p className="px-4 py-3 text-sm text-text-muted">{t('results.searching')}</p>
      )}

      {status === 'error' && <p className="px-4 py-3 text-sm text-text-muted">{t('results.error')}</p>}

      {isEmpty && <p className="px-4 py-3 text-sm text-text-muted">{t('results.empty')}</p>}

      {status === 'ready' && results.length > 0 && (
        <ul id={listboxId} role="listbox" aria-label={t('results.label')} className="max-h-72 overflow-y-auto">
          {results.map((result, index) => (
            <li key={result.id} role="presentation">
              <button
                type="button"
                id={optionId(index)}
                role="option"
                aria-selected={index === activeIndex}
                /*
                  Pointer down, not click: the field keeps focus, and a click
                  would first blur it and close the panel out from under the
                  press. Highlighting on hover keeps the mouse and the arrow
                  keys pointing at the same row.
                */
                onPointerDown={(event) => {
                  event.preventDefault()
                  onSelect(result)
                }}
                onPointerEnter={() => onActivate(index)}
                className={`flex min-h-11 w-full flex-col items-start gap-0.5 px-4 py-2.5 text-left transition-colors ${
                  index === activeIndex ? 'bg-surface-raised' : ''
                }`}
              >
                <span className="text-sm text-text">{result.name}</span>
                {result.displayContext !== '' && (
                  <span className="text-xs text-text-muted">{result.displayContext}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}

      {/*
        Photon serves OpenStreetMap data under ODbL. The map's attribution
        control covers the tiles and says nothing about these results, so the
        credit belongs here, wherever the results are shown.
      */}
      <p className="border-t border-border/60 px-4 py-2 text-[11px] text-text-muted">
        {t('attribution')}
      </p>
    </div>
  )
}
