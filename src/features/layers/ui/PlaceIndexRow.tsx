import { useTranslation } from 'react-i18next'

import type { PlaceWithStats } from '@/features/places/domain/Place'

interface PlaceIndexRowProps {
  place: PlaceWithStats
  /** True while the detail panel is showing this place. */
  isSelected: boolean
  onSelect(): void
}

/**
 * One place under its layer: the name, and the year it was visited.
 *
 * The year rather than the full date. This is an index — a way to find a row
 * among fifty — and a long-form date would be the widest thing on a 320px row
 * while answering a question the detail panel is about to answer properly.
 *
 * Indented past the layer name it sits under, which is the only thing saying it
 * belongs to that layer once the row has scrolled away from its heading.
 *
 * The selected row is marked in `surface-raised`, not `accent`. It is a state,
 * not the primary action — the same reasoning `MapStyleSection` gives for its
 * chosen pill, and the marker on the map is already carrying the one accent
 * this screen is allowed.
 */
export function PlaceIndexRow({ place, isSelected, onSelect }: PlaceIndexRowProps) {
  const { i18n } = useTranslation('layers')

  // No grouping separators: a year is a label, not a quantity, and
  // `Intl.NumberFormat` would otherwise render 2026 as "2,026" in en-US. Still
  // `Intl` and still the active locale — the option is the point.
  const year =
    place.lastVisit === null
      ? null
      : new Intl.NumberFormat(i18n.language, { useGrouping: false }).format(
          place.lastVisit.getFullYear(),
        )

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={isSelected ? 'true' : undefined}
      className={`flex min-h-11 w-full items-center gap-3 rounded-lg py-1 pr-2 pl-9 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text ${
        isSelected ? 'bg-surface-raised' : 'active:bg-surface-raised'
      }`}
    >
      <span className="min-w-0 flex-1 truncate text-sm text-text">{place.name}</span>
      {year && (
        <span className="shrink-0 font-display text-xs text-text-muted tabular-nums">
          {year}
        </span>
      )}
    </button>
  )
}
