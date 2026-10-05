import { useTranslation } from 'react-i18next'

import { usePlacement } from '@/features/places/state/usePlacement'
import { useIsFinePointer } from '@/shared/lib/useIsFinePointer'
import { Panel } from '@/shared/ui/Panel'

/**
 * Takes the top-left slot while placing — today the brand card, and the search
 * bar once that exists. Same slot either way, so the swap does not move the
 * account button.
 */
export function PlacementTopBar() {
  const { t } = useTranslation('map')
  const { cancel } = usePlacement()
  const isFinePointer = useIsFinePointer()

  return (
    <Panel className="pointer-events-auto flex items-center gap-2 py-2 pl-4 pr-2">
      {/*
        The instruction differs by surface because the gesture does: on a coarse
        pointer there is nothing to click and telling someone to would be wrong.
      */}
      <p className="text-sm text-text">
        {isFinePointer ? t('placement.instruction.fine') : t('placement.instruction.coarse')}
      </p>
      <button
        type="button"
        onClick={cancel}
        aria-label={t('placement.cancel')}
        className="flex size-11 shrink-0 items-center justify-center rounded-full text-text-muted transition-colors hover:text-text active:bg-surface-raised"
      >
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          className="size-5"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
        >
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
    </Panel>
  )
}
