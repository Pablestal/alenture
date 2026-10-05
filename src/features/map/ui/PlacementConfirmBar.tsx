import { useTranslation } from 'react-i18next'

import { formatCoordinate } from '@/features/places/domain/coordinates'
import { usePlacement } from '@/features/places/state/usePlacement'
import { useIsFinePointer } from '@/shared/lib/useIsFinePointer'
import { Panel } from '@/shared/ui/Panel'

/**
 * Coordinates plus the two ways out of placement.
 *
 * `pointer-events-auto` is load-bearing on a coarse pointer: the centre pin's
 * layer is transparent to the pointer so the map can be dragged underneath, and
 * this bar is the one thing in that area that must still take a tap.
 */
export function PlacementConfirmBar() {
  const { t, i18n } = useTranslation('map')
  const { draft, cancel, confirm } = usePlacement()
  const isFinePointer = useIsFinePointer()

  return (
    <Panel
      // 400px is the width the form panel takes in 5b — the same column, so the
      // bar keeps its place once the two appear together. Sized by pointer type
      // rather than a breakpoint, for the same reason the surfaces are chosen
      // that way: this is the desktop layout, not the wide-window one.
      className={`pointer-events-auto flex items-center gap-3 p-3 ${isFinePointer ? 'w-[400px]' : 'w-full'}`}
    >
      <div className="min-w-0 flex-1">
        <p className="text-xs text-text-muted">{t('placement.coordinates')}</p>
        {/*
          A fixed-width placeholder rather than a collapsed row: on a fine
          pointer there is no point until the first click, and a bar that grows
          a line at that moment would shift the buttons under the cursor.
        */}
        <p className="font-display text-sm text-text tabular-nums">
          {draft
            ? `${formatCoordinate(draft.lat, i18n.language)}, ${formatCoordinate(draft.lng, i18n.language)}`
            : t('placement.awaitingPoint')}
        </p>
      </div>
      <button
        type="button"
        onClick={cancel}
        className="h-11 shrink-0 rounded-full px-4 text-sm text-text-muted transition-colors hover:text-text active:bg-surface-raised"
      >
        {t('placement.cancel')}
      </button>
      <button
        type="button"
        onClick={confirm}
        disabled={draft === null}
        className="h-11 shrink-0 rounded-full bg-accent px-5 text-sm font-medium text-surface transition-colors active:bg-accent-pressed disabled:opacity-40"
      >
        {t('placement.confirm')}
      </button>
    </Panel>
  )
}
