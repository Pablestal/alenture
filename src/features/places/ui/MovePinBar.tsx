import { useTranslation } from 'react-i18next'

import { formatCoordinate } from '@/features/places/domain/coordinates'
import { usePlaceEdit } from '@/features/places/state/usePlaceEdit'
import { Panel } from '@/shared/ui/Panel'

/**
 * What is left on screen during the coarse-pointer move step: the live
 * coordinates and the way back to the form.
 *
 * It stands where `PlacementConfirmBar` stands and says the same kind of thing,
 * but it is not that component — this one confirms nothing. The move is already
 * in the draft as the pin is dragged, and Done only brings the sheet back; the
 * edit is still unsaved and still cancellable afterwards. Wiring this to
 * `confirm` semantics would make Done sound like a commit it is not.
 */
export function MovePinBar() {
  const { t, i18n } = useTranslation('places')
  const { draft, stopMovingPin } = usePlaceEdit()

  if (!draft) {
    return null
  }

  return (
    <Panel className="pointer-events-auto flex w-full items-center gap-3 p-3">
      <div className="min-w-0 flex-1">
        <p className="text-xs text-text-muted">{t('detail.move.hint')}</p>
        <p className="font-display text-sm text-text tabular-nums">
          {formatCoordinate(draft.coordinates.lat, i18n.language)}
          {', '}
          {formatCoordinate(draft.coordinates.lng, i18n.language)}
        </p>
      </div>
      <button
        type="button"
        onClick={stopMovingPin}
        className="h-11 shrink-0 rounded-full bg-accent px-5 text-sm font-medium text-surface transition-colors active:bg-accent-pressed"
      >
        {t('detail.move.done')}
      </button>
    </Panel>
  )
}
