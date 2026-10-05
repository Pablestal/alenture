import { useTranslation } from 'react-i18next'

import type { Layer } from '@/features/layers/domain/Layer'

interface LayerPickerProps {
  layers: readonly Layer[]
  /** Null is the "no layer" pill, which is a choice and not an empty state. */
  selectedId: string | null
  disabled: boolean
  onSelect(layerId: string | null): void
}

/**
 * Which layer this place is filed under: a row of pills that wraps.
 *
 * The shape the deleted `CategoryPicker` had, and deliberately so — pills over
 * a select because the whole list is worth seeing at once, and because filing
 * is a decision you make by looking at what you have already made rather than
 * by reading a dropdown.
 *
 * What is different is where the options come from. Categories were ours: seven
 * of them, in the database, the same for everybody. These are the user's, and
 * the picker has nothing to say about what belongs in the list.
 *
 * A radio group, not toggles: a place is in one layer or none. Multiple layers
 * per place is a later question, and a join table when it comes.
 *
 * No pill is accented, including the chosen one. It is a selected state, and
 * the form's save button already holds the one accent this screen has — see
 * `MapStyleSection`, which makes the same argument about the same shape.
 *
 * Presentational: it takes the list rather than reading `useLayers()`, so
 * `PlaceForm` stays a component you can hand values to. Both containers are
 * inside the provider and pass it down.
 */
export function LayerPicker({ layers, selectedId, disabled, onSelect }: LayerPickerProps) {
  const { t } = useTranslation('places')

  return (
    <div role="radiogroup" aria-label={t('form.layer.label')} className="flex flex-wrap gap-2">
      {/*
        First, not last. It is the state every place starts in, and burying the
        way back to it after a list of the user's own layers would make unfiling
        something harder than filing it.
      */}
      <Pill
        label={t('form.layer.none')}
        isSelected={selectedId === null}
        disabled={disabled}
        onSelect={() => onSelect(null)}
      />
      {layers.map((layer) => (
        <Pill
          key={layer.id}
          label={layer.name}
          isSelected={selectedId === layer.id}
          disabled={disabled}
          onSelect={() => onSelect(layer.id)}
        />
      ))}
      {/*
        No layers yet, so the only pill is "no layer" and the row reads like a
        control that is broken. One line saying where layers come from — this
        form is deliberately not where they are made, because a layer is a
        scheme and not a property of the place in front of you.
      */}
      {layers.length === 0 && (
        <p className="self-center text-xs text-text-muted">{t('form.layer.empty')}</p>
      )}
    </div>
  )
}

function Pill({
  label,
  isSelected,
  disabled,
  onSelect,
}: {
  label: string
  isSelected: boolean
  disabled: boolean
  onSelect(): void
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={isSelected}
      disabled={disabled}
      onClick={onSelect}
      className={`min-h-11 max-w-full truncate rounded-full border px-4 text-sm transition-colors disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text ${
        isSelected
          ? 'border-border bg-surface-raised text-text'
          : 'border-border/60 text-text-muted active:bg-surface-raised'
      }`}
    >
      {label}
    </button>
  )
}
