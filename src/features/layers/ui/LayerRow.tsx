import { useTranslation } from 'react-i18next'
import { ArrowDown, ArrowUp, Check, ChevronDown, Trash2 } from 'lucide-react'

interface LayerRowProps {
  label: string
  count: number
  /** Whether the places in this layer are currently drawn. */
  isVisible: boolean
  isExpanded: boolean
  /**
   * False for the Unassigned group, which is not a layer: it cannot be renamed,
   * reordered or deleted, so manage mode leaves it alone rather than showing it
   * three disabled buttons.
   */
  isManageable: boolean
  /** True while the panel is in manage mode. */
  isManaging: boolean
  /** Both false at the ends of the list, where the arrows have nowhere to go. */
  canMoveUp: boolean
  canMoveDown: boolean
  isBusy: boolean
  onToggleExpanded(): void
  onToggleVisible(): void
  onRename(): void
  onMove(direction: 'up' | 'down'): void
  onDelete(): void
}

/**
 * One layer, as the index's heading: its name, how many places are in it,
 * whether they are drawn, and whether its list is open.
 *
 * ## Why the row has two shapes
 *
 * At rest it is a disclosure and a checkbox — the two things you do to a layer
 * a hundred times. In manage mode it is a rename, two arrows and a delete — the
 * things you do to one about twice. Both fit in a 320px row only because they
 * take turns; a row carrying all six controls at once would be six 44px targets
 * in 320px, and the name would have no room left to be read.
 *
 * That is also why renaming is the name itself rather than a fourth button.
 *
 * ## The count
 *
 * Of what EXISTS, never of what is showing — it does not move when the row is
 * unticked. It says how many places you have filed here, which is a fact about
 * your map, not about the current view. `FilterRow` says the same about its own.
 *
 * Nothing here is accented. This panel has no primary action; the add button in
 * this corner has it.
 */
export function LayerRow({
  label,
  count,
  isVisible,
  isExpanded,
  isManageable,
  isManaging,
  canMoveUp,
  canMoveDown,
  isBusy,
  onToggleExpanded,
  onToggleVisible,
  onRename,
  onMove,
  onDelete,
}: LayerRowProps) {
  const { t, i18n } = useTranslation('layers')
  // Grouped, unlike the years beside the places below: a count of 1,240 places
  // is a quantity and reads as one.
  const countLabel = new Intl.NumberFormat(i18n.language).format(count)

  if (isManaging && isManageable) {
    return (
      <div className="flex min-h-11 w-full items-center gap-1">
        <button
          type="button"
          onClick={onRename}
          disabled={isBusy}
          aria-label={t('manage.rename', { name: label })}
          className="min-h-11 min-w-0 flex-1 truncate rounded-lg px-2 text-left text-sm text-text underline decoration-border decoration-dotted underline-offset-4 transition-colors active:bg-surface-raised disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text"
        >
          {label}
        </button>
        <IconButton
          label={t('manage.moveUp', { name: label })}
          onClick={() => onMove('up')}
          disabled={isBusy || !canMoveUp}
        >
          <ArrowUp aria-hidden="true" focusable="false" className="size-4" />
        </IconButton>
        <IconButton
          label={t('manage.moveDown', { name: label })}
          onClick={() => onMove('down')}
          disabled={isBusy || !canMoveDown}
        >
          <ArrowDown aria-hidden="true" focusable="false" className="size-4" />
        </IconButton>
        {/*
          `danger` on the icon, and this is only the way in to the question —
          the filled destructive button belongs to the confirmation, where it is
          the thing that actually deletes. Same split as the detail panel's.
        */}
        <IconButton
          label={t('manage.delete', { name: label })}
          onClick={onDelete}
          disabled={isBusy}
          className="text-danger"
        >
          <Trash2 aria-hidden="true" focusable="false" className="size-4" />
        </IconButton>
      </div>
    )
  }

  return (
    <div className="flex min-h-11 w-full items-center">
      {/*
        Two controls, two buttons — not one row that does both. Pressing the
        name to open the list and the box to hide the places are different acts,
        and a single row toggling one of them by hit-position is how you end up
        hiding a layer you meant to read.
      */}
      <button
        type="button"
        onClick={onToggleExpanded}
        aria-expanded={isExpanded}
        className="flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-lg px-2 text-left transition-colors active:bg-surface-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text"
      >
        <ChevronDown
          aria-hidden="true"
          focusable="false"
          // Rotates rather than swapping icons: one element turning says the
          // two states are the same control. The panel header does this too.
          className={`size-4 shrink-0 text-text-muted transition-transform ${
            isExpanded ? '' : '-rotate-90'
          }`}
        />
        <span
          className={`min-w-0 flex-1 truncate text-sm ${isVisible ? 'text-text' : 'text-text-muted'}`}
        >
          {label}
        </span>
        <span className="shrink-0 font-display text-xs text-text-muted tabular-nums">
          {countLabel}
        </span>
      </button>

      {/*
        `aria-pressed` rather than a real checkbox, matching `FilterRow` and
        `PlaceMarker`: it is a toggle over what the map draws, with no form to
        be submitted with.
      */}
      <button
        type="button"
        onClick={onToggleVisible}
        aria-pressed={isVisible}
        aria-label={t('index.toggle', { name: label })}
        className="flex size-11 shrink-0 items-center justify-center rounded-lg transition-colors active:bg-surface-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text"
      >
        <span
          aria-hidden="true"
          className={`flex size-5 items-center justify-center rounded border transition-colors ${
            isVisible ? 'border-text bg-text text-surface' : 'border-border'
          }`}
        >
          {isVisible && <Check focusable="false" className="size-3.5" strokeWidth={3} />}
        </span>
      </button>
    </div>
  )
}

/** A 44px square target around a 16px icon. */
function IconButton({
  label,
  onClick,
  disabled,
  className = '',
  children,
}: {
  label: string
  onClick(): void
  disabled: boolean
  className?: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={`flex size-11 shrink-0 items-center justify-center rounded-lg text-text-muted transition-colors active:bg-surface-raised disabled:opacity-30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text ${className}`}
    >
      {children}
    </button>
  )
}
