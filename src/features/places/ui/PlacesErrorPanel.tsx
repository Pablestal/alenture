import { useTranslation } from 'react-i18next'

import { usePlaces } from '@/features/places/state/usePlaces'
import { Panel } from '@/shared/ui/Panel'

/**
 * The load failed. Non-blocking by design: the map is still there and still
 * usable, this only explains why it is bare and offers another go.
 *
 * The text is translated, never the caught error — a Postgres message has no
 * business on screen.
 */
export function PlacesErrorPanel() {
  const { t } = useTranslation('places')
  const { status, refresh } = usePlaces()

  if (status !== 'error') {
    return null
  }

  return (
    <Panel role="alert" className="pointer-events-auto flex max-w-xs items-center gap-3 p-3">
      <p className="text-sm text-text">{t('error.loadFailed')}</p>
      <button
        type="button"
        onClick={refresh}
        className="min-h-11 shrink-0 rounded-full border border-border px-4 text-sm text-text transition-colors active:bg-surface-raised"
      >
        {t('error.retry')}
      </button>
    </Panel>
  )
}
