import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useLayers } from '@/features/layers/state/useLayers'
import { todayDateOnly } from '@/features/places/domain/dateOnly'
import type { PlaceSource } from '@/features/places/domain/Place'
import type { PlaceDraft, PlaceDraftErrors } from '@/features/places/domain/placeDraft'
import { hasErrors, validatePlaceDraft } from '@/features/places/domain/placeDraft'
import { PlaceForm } from '@/features/places/ui/PlaceForm'
import type { SaveErrorKey } from '@/features/places/ui/saveErrorKey'
import { toSaveErrorKey } from '@/features/places/ui/saveErrorKey'
import { usePlacement } from '@/features/places/state/usePlacement'
import { usePlaces } from '@/features/places/state/usePlaces'
import { useIsFinePointer } from '@/shared/lib/useIsFinePointer'
import { ConfirmPrompt } from '@/shared/ui/ConfirmPrompt'
import { Panel } from '@/shared/ui/Panel'
import { Sheet } from '@/shared/ui/Sheet'

/**
 * What the fields hold before anything is typed. Coordinates come from the pin,
 * and `source` is derived at save time rather than stored — see `source` below.
 */
type DraftFields = Omit<PlaceDraft, 'coordinates' | 'source'>

function initialFields(): DraftFields {
  return {
    name: '',
    // Today, because that is the overwhelmingly common answer. Clearing it is
    // how you say "been here, don't remember when".
    startedOn: todayDateOnly(),
    notes: '',
    // Unfiled. Deliberately not "whichever layer is currently the only visible
    // one", or the last one used: a guess at where this belongs is a guess the
    // user then has to notice and undo, and unfiled is the honest starting
    // point for a place they have not decided about yet.
    layerId: null,
    // Filled in by the geocoder if it answers, and never by the user: there is
    // no control for it, because it describes the pin rather than the name.
    countryCode: null,
  }
}

/**
 * Right-hand panel on a fine pointer, bottom sheet on a coarse one. Both hold
 * the same `PlaceForm`, so there is one form and two frames around it — never
 * two forms.
 */
export function PlaceFormContainer() {
  const { t } = useTranslation('places')
  const { draft: coordinates, detection, cancel } = usePlacement()
  const { createPlace } = usePlaces()
  const { layers } = useLayers()
  const isFinePointer = useIsFinePointer()

  const [fields, setFields] = useState<DraftFields>(initialFields)
  /**
   * The name the geocoder offered, or '' before it has offered one. Kept so the
   * field's current value can be compared against it — that comparison is what
   * separates a suggestion the user accepted from one they typed themselves,
   * and it is the only record of it. Nothing else can tell the two apart,
   * because by then they are both just text in an input.
   */
  const [prefilledName, setPrefilledName] = useState('')
  const [errors, setErrors] = useState<PlaceDraftErrors>({})
  const [saveError, setSaveError] = useState<SaveErrorKey | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isConfirmingDiscard, setIsConfirmingDiscard] = useState(false)

  // Only the typed fields count. The pin moving is not "work in progress" worth
  // a confirmation — it is one drag to redo, and the form is where the effort is.
  //
  // Compared against the prefilled name rather than against '': a name the
  // geocoder wrote is not work the user would be sorry to lose, and asking them
  // to confirm discarding it would be asking about something they never did.
  const isDirty =
    fields.name !== prefilledName ||
    fields.notes !== '' ||
    fields.startedOn !== todayDateOnly() ||
    // Filing is a decision, and the picker leaves no half-typed text to prove
    // one was made. Without this, choosing a layer and then closing would lose
    // it without being asked.
    fields.layerId !== null

  /**
   * 'search' only while the field still holds exactly what the geocoder gave,
   * and only when it gave something. Anything else — typed from scratch,
   * corrected, or cleared — is 'manual'.
   *
   * Derived rather than stored because it is a statement about the name as it
   * stands at save time, and every way of storing it means keeping a flag in
   * step with an input that can change back.
   */
  const source: PlaceSource =
    prefilledName !== '' && fields.name === prefilledName ? 'search' : 'manual'

  useEffect(() => {
    const result = detection.result
    if (!result) {
      return
    }
    setFields((current) => ({
      ...current,
      // Applied whatever the name ends up being: the code describes where the
      // pin is, and overwriting "Salamanca" with something of your own does not
      // move it out of Spain.
      countryCode: result.countryCode,
      // Never overwrite what someone wrote. The form opened before the answer
      // arrived, so by now the user may well have typed the name themselves —
      // and their answer is the one that stands.
      name: current.name === '' ? result.name : current.name,
    }))
    // Recorded even when the line above declined to apply it: the user typing
    // first is exactly the case where the two must not be confused later.
    setPrefilledName(result.name)
  }, [detection.result])

  const requestClose = useCallback(() => {
    // Asked only when there is something to lose. A confirmation on an untouched
    // form is how people learn to dismiss dialogues without reading them.
    if (isDirty) {
      setIsConfirmingDiscard(true)
      return
    }
    cancel()
  }, [isDirty, cancel])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') {
        return
      }
      if (isConfirmingDiscard) {
        // Escape backs out of the question, it does not answer it. Otherwise the
        // key that opened the prompt would also confirm the discard.
        setIsConfirmingDiscard(false)
        return
      }
      requestClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [requestClose, isConfirmingDiscard])

  const handleChange = (patch: Partial<PlaceDraft>) => {
    setFields((current) => ({ ...current, ...patch }))
    // The save error belonged to the values as they were. Anything typed since
    // makes it stale, and a red line that outlives its cause is worse than none.
    setSaveError(null)
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (isSaving || !coordinates) {
      return
    }

    const draft: PlaceDraft = { ...fields, coordinates, source }
    const found = validatePlaceDraft(draft)
    setErrors(found)
    if (hasErrors(found)) {
      return
    }

    setIsSaving(true)
    setSaveError(null)
    try {
      await createPlace(draft)
      // The marker is already on the map — `createPlace` put it there before the
      // request went out. Nothing left to do but leave.
      cancel()
    } catch (error) {
      setSaveError(toSaveErrorKey(error))
    } finally {
      setIsSaving(false)
    }
  }

  // Placement left 'editing' underneath us. Nothing to render against.
  if (!coordinates) {
    return null
  }

  const body = (
    <form onSubmit={(event) => void handleSubmit(event)} className="flex flex-col gap-4 p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-display text-base font-bold text-text">{t('form.title')}</h2>
        <button
          type="button"
          onClick={requestClose}
          disabled={isSaving}
          aria-label={t('form.close')}
          className="flex size-11 shrink-0 items-center justify-center rounded-full text-text-muted transition-colors hover:text-text"
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
      </div>

      <PlaceForm
        mode="edit"
        draft={{ ...fields, coordinates, source }}
        layers={layers}
        errors={errors}
        disabled={isSaving}
        detection={detection}
        onChange={handleChange}
      />

      {/*
        The save error sits with the button that caused it, not in an alert.
        `role="alert"` so it is announced — it appears after the press, when
        focus is nowhere near it.
      */}
      {saveError && (
        <p role="alert" className="text-sm text-danger">
          {t(saveError)}
        </p>
      )}

      <button
        type="submit"
        disabled={isSaving}
        className="min-h-11 w-full rounded-full bg-accent px-5 text-sm font-medium text-surface transition-colors active:bg-accent-pressed disabled:opacity-50"
      >
        {isSaving ? t('form.saving') : t('form.save')}
      </button>
    </form>
  )

  /*
    Kept apart from `body`, and it is not a formatting preference.

    `ConfirmPrompt` is `absolute inset-0`. Inside a scrolling element that pins
    it to the top of the CONTENT rather than the top of the panel: scroll down
    and the question goes with it, off the top of the visible area, while the
    panel it is supposed to be covering stays on screen and live. So the
    scroller is an inner element and the prompt is its sibling — over the panel,
    wherever the panel happens to be scrolled to.

    Invisible while a panel is short, which is what this one was until the notes
    field grew to 2000 characters and a layer picker joined the fields above it.
  */
  const prompts = (
    <>
      {isConfirmingDiscard && (
        <ConfirmPrompt
          title={t('form.discard.title')}
          message={t('form.discard.message')}
          cancelLabel={t('form.discard.keep')}
          confirmLabel={t('form.discard.confirm')}
          onCancel={() => setIsConfirmingDiscard(false)}
          onConfirm={cancel}
        />
      )}
    </>
  )

  if (isFinePointer) {
    return (
      <Panel className="pointer-events-auto relative flex w-[400px] flex-col overflow-hidden">
        <div className="min-h-0 flex-1 overflow-y-auto">{body}</div>
        {prompts}
      </Panel>
    )
  }

  return (
    <Sheet handleLabel={t('form.sheetHandle')} onDismiss={requestClose} overlay={prompts}>
      {body}
    </Sheet>
  )
}
