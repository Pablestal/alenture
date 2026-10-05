import { useTranslation } from 'react-i18next'

import type { MapStyleId } from '@/features/layers/domain/mapStyle'
import { MAP_STYLE_IDS } from '@/features/layers/domain/mapStyle'
import { useMapView } from '@/features/layers/state/useMapView'

/**
 * Which basemap the map draws on. Two options, and see `domain/mapStyle.ts` for
 * why there is no third.
 *
 * A radio group, not a set of toggles: exactly one style is in use, and the
 * rows above it are checkboxes for a reason that does not apply here.
 *
 * The chosen option is `surface-raised`, NOT `accent`. It is a selected state,
 * and the accent marks the single primary action in a context — this panel has
 * none, and the add button in this corner already has it. Accenting the current
 * style would put two accents on screen and demote the one that means "do the
 * thing".
 */
export function MapStyleSection() {
  const { t } = useTranslation('layers')
  const { mapStyleId, setMapStyleId } = useMapView()

  return (
    <div role="radiogroup" aria-label={t('style.title')} className="flex gap-2">
      {MAP_STYLE_IDS.map((id) => (
        <StyleOption
          key={id}
          id={id}
          label={t(`style.${id}`)}
          isSelected={id === mapStyleId}
          onSelect={() => setMapStyleId(id)}
        />
      ))}
    </div>
  )
}

function StyleOption({
  id,
  label,
  isSelected,
  onSelect,
}: {
  id: MapStyleId
  label: string
  isSelected: boolean
  onSelect(): void
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={isSelected}
      onClick={onSelect}
      className={`min-h-11 flex-1 rounded-full border px-4 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text ${
        isSelected
          ? 'border-border bg-surface-raised text-text'
          : 'border-border/60 text-text-muted active:bg-surface-raised'
      }`}
    >
      {/*
        The swatch is the honest label here — "dark" and "light" are words for
        something you can just show. Bordered so the light one is visible
        against a light-ish panel and the dark one against a dark one.
      */}
      <span className="flex items-center justify-center gap-2">
        <span
          aria-hidden="true"
          className={`size-3 shrink-0 rounded-full border border-text/40 ${
            id === 'dark' ? 'bg-surface' : 'bg-text'
          }`}
        />
        {label}
      </span>
    </button>
  )
}
