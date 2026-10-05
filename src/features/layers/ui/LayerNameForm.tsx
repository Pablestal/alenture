import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { MAX_LAYER_NAME_LENGTH, validateLayerName } from '@/features/layers/domain/Layer'

interface LayerNameFormProps {
  /** Empty when creating, the current name when renaming. */
  initialName: string
  submitLabel: string
  /** Already translated. The failure of the last attempt, if there was one. */
  submitError?: string | undefined
  isBusy: boolean
  onSubmit(name: string): void
  onCancel(): void
}

/**
 * One text field and two buttons, used for both creating a layer and renaming
 * one. They are the same form — a name, confirmed — and splitting them would be
 * two places for the length rule and the empty-name message to drift apart.
 *
 * A real `<form>`, so Enter submits. Renaming a row is a two-second job and
 * reaching for a button with the mouse to finish it is the thing that makes it
 * feel like a five-second one.
 *
 * Neither button is accented. The add-place button holds the accent in this
 * corner of the app, and the layers panel is furniture — see `FilterRow` and
 * `MapStyleSection`, which say the same thing about their own controls.
 * `MagicLinkForm` is the precedent for a genuine submit button that is not
 * primary in the screen it appears on.
 */
export function LayerNameForm({
  initialName,
  submitLabel,
  submitError,
  isBusy,
  onSubmit,
  onCancel,
}: LayerNameFormProps) {
  const { t } = useTranslation('layers')
  const [name, setName] = useState(initialName)
  const [error, setError] = useState<string | null>(null)
  /**
   * Whether anything has been typed since the last attempt. `submitError`
   * belongs to the name as it was sent, so a keystroke makes it stale — and it
   * is the parent's state, which this form has no way to clear.
   */
  const [typedSinceSubmit, setTypedSinceSubmit] = useState(false)

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    if (isBusy) {
      return
    }
    const invalid = validateLayerName(name)
    if (invalid) {
      setError(t(invalid))
      return
    }
    setError(null)
    // Before the call, so the failure it may produce is not immediately
    // suppressed by the typing that came before it.
    setTypedSinceSubmit(false)
    onSubmit(name)
  }

  // The submit failure only stands until the user types: it belonged to the
  // name as it was, and a red line that outlives its cause is worse than none.
  const message = error ?? (typedSinceSubmit ? undefined : submitError)

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 px-2 py-1">
      <input
        type="text"
        value={name}
        disabled={isBusy}
        // Autofocused because the form only ever exists because the user just
        // pressed the thing that opens it. There is nothing else to do here.
        autoFocus
        maxLength={MAX_LAYER_NAME_LENGTH}
        placeholder={t('manage.namePlaceholder')}
        aria-label={t('manage.nameLabel')}
        aria-invalid={message ? true : undefined}
        onChange={(event) => {
          setName(event.target.value)
          setError(null)
          setTypedSinceSubmit(true)
        }}
        onKeyDown={(event) => {
          // Escape backs out of the form without submitting it. Stopped from
          // propagating so it does not also close the sheet behind it — the key
          // steps back one level at a time.
          if (event.key === 'Escape') {
            event.stopPropagation()
            onCancel()
          }
        }}
        className="min-h-11 w-full rounded-xl border border-border/60 bg-surface-raised/60 px-3 text-sm text-text placeholder:text-text-muted/70 focus:border-text/40 focus:outline-none disabled:opacity-50"
      />

      {message && (
        <p role="alert" className="text-xs text-danger">
          {message}
        </p>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={isBusy}
          className="min-h-11 flex-1 rounded-full px-3 text-sm text-text-muted transition-colors hover:text-text disabled:opacity-50"
        >
          {t('manage.cancel')}
        </button>
        <button
          type="submit"
          disabled={isBusy}
          className="min-h-11 flex-1 rounded-full border border-border/60 bg-surface-raised px-3 text-sm font-medium text-text disabled:opacity-50"
        >
          {isBusy ? t('manage.saving') : submitLabel}
        </button>
      </div>
    </form>
  )
}
