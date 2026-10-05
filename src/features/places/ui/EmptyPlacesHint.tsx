import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'

import { useAuth } from '@/features/auth/state/useAuth'
import { usePlaces } from '@/features/places/state/usePlaces'
import { Panel } from '@/shared/ui/Panel'

/**
 * A one-line nudge towards the add button, shown only to a signed-in account
 * that genuinely has no places. 'idle' means signed out, and 'loading' means we
 * do not know yet — neither is an empty map worth commenting on.
 *
 * Dismissal is per-session state on purpose: nothing is persisted until we know
 * whether the hint is worth remembering.
 */
export function EmptyPlacesHint() {
  const { t } = useTranslation('places')
  const { status: authStatus } = useAuth()
  const { places, status } = usePlaces()
  const [dismissed, setDismissed] = useState(false)

  if (dismissed || authStatus !== 'authenticated' || status !== 'ready' || places.length > 0) {
    return null
  }

  return (
    <Panel className="pointer-events-auto flex max-w-xs items-center gap-2 py-2 pr-2 pl-3">
      <p className="text-sm text-text-muted">{t('emptyHint.message')}</p>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label={t('emptyHint.dismiss')}
        className="flex size-11 shrink-0 items-center justify-center rounded-full text-text-muted transition-colors active:bg-surface-raised"
      >
        <X aria-hidden="true" focusable="false" className="size-4" />
      </button>
    </Panel>
  )
}
