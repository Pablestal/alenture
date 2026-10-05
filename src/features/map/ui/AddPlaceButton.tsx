import { useTranslation } from 'react-i18next'

import { usePlacement } from '@/features/places/state/usePlacement'

/** Enters placement mode. The confirm bar takes over from here. */
export function AddPlaceButton() {
  const { t } = useTranslation('map')
  const { start } = usePlacement()

  return (
    <button
      type="button"
      onClick={start}
      aria-label={t('addPlace.label')}
      className="pointer-events-auto flex size-14 items-center justify-center rounded-full bg-accent text-surface shadow-lg transition-colors active:bg-accent-pressed"
    >
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className="size-6"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.5}
        strokeLinecap="round"
      >
        <path d="M12 5v14M5 12h14" />
      </svg>
    </button>
  )
}
