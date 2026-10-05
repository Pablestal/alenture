import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Search, X } from 'lucide-react'

import { useSearch } from '@/features/search/state/useSearch'
import { SearchField } from '@/features/search/ui/SearchField'

/**
 * The coarse-pointer surface. There is no room for a field beside the brand
 * card and the account button, so the top row carries an icon and the field
 * arrives full width over the map.
 *
 * Closing always returns to the icon rather than merely blurring: an overlay
 * left open with nothing focused covers the map and offers no way out.
 */
export function SearchOverlay() {
  const { t } = useTranslation('search')
  const { clear } = useSearch()
  const [open, setOpen] = useState(false)

  const close = useCallback(() => {
    setOpen(false)
    clear()
  }, [clear])

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t('open')}
        aria-haspopup="dialog"
        className="pointer-events-auto flex size-11 shrink-0 items-center justify-center rounded-full border border-border/60 bg-surface/85 text-text backdrop-blur-md"
      >
        <Search aria-hidden="true" focusable="false" className="size-5" />
      </button>
    )
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('field.label')}
      /*
        Fixed to the viewport, not to the chrome layer: the overlay owns the
        whole screen while it is open, including its own safe-area insets.
      */
      /*
        Escape at the overlay's level, not only the field's: focus may be on
        the close button, and the key means the same thing wherever it lands.
      */
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault()
          close()
        }
      }}
      className="pointer-events-auto fixed inset-0 z-10 flex flex-col bg-surface/40 backdrop-blur-sm"
      style={{
        paddingTop: 'calc(16px + env(safe-area-inset-top))',
        paddingRight: 'calc(16px + env(safe-area-inset-right))',
        paddingLeft: 'calc(16px + env(safe-area-inset-left))',
      }}
    >
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          {/* Focused on open: the overlay exists to be typed into. */}
          <SearchField autoFocus onDismiss={close} />
        </div>
        <button
          type="button"
          onClick={close}
          aria-label={t('close')}
          className="flex size-11 shrink-0 items-center justify-center rounded-full border border-border/60 bg-surface/85 text-text backdrop-blur-md"
        >
          <X aria-hidden="true" focusable="false" className="size-5" />
        </button>
      </div>

      {/*
        The rest of the screen closes the overlay. It is the map underneath, and
        reaching for it is as clear a "not this" as the close button.
      */}
      <button
        type="button"
        onClick={close}
        aria-label={t('close')}
        tabIndex={-1}
        className="flex-1 cursor-default"
      />
    </div>
  )
}
