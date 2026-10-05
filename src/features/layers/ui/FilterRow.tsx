import { useTranslation } from 'react-i18next'
import { Check } from 'lucide-react'

interface FilterRowProps {
  label: string
  count: number
  /** Whether the places in this row are currently drawn. */
  isVisible: boolean
  onToggle(): void
}

/**
 * One tickable row: a label, and the number of places behind it.
 *
 * `aria-pressed` rather than a real checkbox, matching `PlaceMarker`: the row is
 * a toggle over what the map draws, and it has no form to be submitted with.
 *
 * The tick is `text`, never `accent`. Nothing in this panel is a primary action
 * — a filter row is a state, and the accent belongs to the add button in this
 * corner of the app and to the pin the screen is about. See the accent rule in
 * CLAUDE.md: it is not a highlight and not an emphasis.
 *
 * The count is in tabular figures and does not move when the row is unticked.
 * It says how many of these you HAVE, which is a fact about your travels, not
 * about the current view.
 */
export function FilterRow({ label, count, isVisible, onToggle }: FilterRowProps) {
  const { i18n } = useTranslation()
  // Grouped, unlike the years in the labels beside it: a count of 1,240 places
  // is a quantity and reads as one. `Intl` with the active locale, never a bare
  // `toLocaleString()`.
  const countLabel = new Intl.NumberFormat(i18n.language).format(count)

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={isVisible}
      className="flex min-h-11 w-full items-center gap-3 rounded-lg px-2 text-left transition-colors active:bg-surface-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text"
    >
      <span
        aria-hidden="true"
        className={`flex size-5 shrink-0 items-center justify-center rounded border transition-colors ${
          isVisible ? 'border-text bg-text text-surface' : 'border-border'
        }`}
      >
        {isVisible && <Check focusable="false" className="size-3.5" strokeWidth={3} />}
      </span>
      {/*
        The label dims when the row is off — the tick is a 20px box and the row
        needs to read as off at a glance, from across the panel. The count keeps
        its own colour: it is still true.
      */}
      <span className={`min-w-0 flex-1 truncate text-sm ${isVisible ? 'text-text' : 'text-text-muted'}`}>
        {label}
      </span>
      <span className="shrink-0 font-display text-xs text-text-muted tabular-nums">{countLabel}</span>
    </button>
  )
}
