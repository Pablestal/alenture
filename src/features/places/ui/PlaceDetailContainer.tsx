import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useDeselectHidden } from '@/features/layers/hooks/useDeselectHidden'
import { useLayers } from '@/features/layers/state/useLayers'
import { RepositoryError } from '@/features/places/data/RepositoryError'
import type { PlaceDraft, PlaceDraftErrors } from '@/features/places/domain/placeDraft'
import { hasErrors, validatePlaceDraft } from '@/features/places/domain/placeDraft'
import { isDraftDirty } from '@/features/places/domain/placePatch'
import { placeToDraft } from '@/features/places/domain/placeToDraft'
import { useNameSuggestion } from '@/features/places/hooks/useNameSuggestion'
import { MovePinBar } from '@/features/places/ui/MovePinBar'
import { PlaceForm } from '@/features/places/ui/PlaceForm'
import type { SaveErrorKey } from '@/features/places/ui/saveErrorKey'
import { toSaveErrorKey } from '@/features/places/ui/saveErrorKey'
import { usePlaceEdit } from '@/features/places/state/usePlaceEdit'
import { usePlaces } from '@/features/places/state/usePlaces'
import { useSelection } from '@/features/places/state/useSelection'
import { useIsFinePointer } from '@/shared/lib/useIsFinePointer'
import { ConfirmPrompt } from '@/shared/ui/ConfirmPrompt'
import { Panel } from '@/shared/ui/Panel'
import { Sheet } from '@/shared/ui/Sheet'

/** Reading the record, or changing it. Never both, and never a third thing. */
type PanelMode = 'read' | 'edit'

/**
 * At most one question is ever on screen, so this is one value rather than two
 * booleans that could both be true. 'discard' guards leaving an edited form;
 * 'delete' guards the delete itself.
 */
type Prompt = 'none' | 'discard' | 'delete'

/**
 * A saved place: read back, edited, or deleted. The same frames as the add form
 * — 400px panel on a fine pointer, bottom sheet on a coarse one — around the
 * same `PlaceForm`, switched between its two modes in place.
 *
 * Opening this does not move the map. A place is selected by pressing its
 * marker, so the marker is on screen already, and a camera move would take it
 * somewhere the user did not ask to go. On a fine pointer the panel can cover
 * the pin it is describing; the fix for that is the padding-plus-recentre the
 * add flow uses, which is a camera move, so it is not a fix for this.
 *
 * Read and edit share the dirty gate, the prompt and the Escape rule, which is
 * why they share a component. Splitting the two modes apart would put the
 * question "is there unsaved work" on one side of a boundary and the thing that
 * asks it on the other.
 */
export function PlaceDetailContainer() {
  const { t } = useTranslation('places')
  const { places, deletePlace, updatePlace } = usePlaces()
  const { selectedId, clear } = useSelection()
  const { layers } = useLayers()
  const {
    draft: fields,
    origin,
    settledAt,
    isMovingPin,
    start: startEdit,
    patch: patchDraft,
    startMovingPin,
    stopMovingPin,
    stop: stopEdit,
  } = usePlaceEdit()
  const isFinePointer = useIsFinePointer()

  const [panelMode, setPanelMode] = useState<PanelMode>('read')
  const [prompt, setPrompt] = useState<Prompt>('none')
  const [errors, setErrors] = useState<PlaceDraftErrors>({})
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<SaveErrorKey | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<DeleteErrorKey | null>(null)
  /**
   * The place saved but its date did not. Survives the return to read mode
   * because that is when it is read: the panel is showing the saved name beside
   * the date that did not change, and nothing else on screen would say so.
   */
  const [dateFailed, setDateFailed] = useState(false)

  const place = places.find((candidate) => candidate.id === selectedId) ?? null

  /*
    Filtered out from under the panel — someone unticked its year, its country
    or its layer while it was open. The selection is cleared rather than the
    panel merely hidden, so the marker's accent goes with it: details of a place
    the map is not drawing is a screen making two contradictory claims.

    Reachable from the index now in a way it was not before: on a fine pointer
    the layers panel stays open beside this one, so the row that opened this
    panel is one press away from hiding the place it opened.
  */
  useDeselectHidden(place)

  // Everything transient belongs to the place that was open. Selecting another
  // marker must not carry a prompt, a half-typed name or a stale message onto it.
  useEffect(() => {
    setPanelMode('read')
    setPrompt('none')
    setErrors({})
    setSaveError(null)
    setDeleteError(null)
    setDateFailed(false)
    // The draft lives in the provider now, so abandoning it is a call rather
    // than a `setState(null)`. Everything else on the map reads from there —
    // leaving it behind would strand a draggable pin over a place whose panel
    // has moved on.
    stopEdit()
  }, [selectedId, stopEdit])

  const isDirty = place !== null && fields !== null && isDraftDirty(place, fields)
  const isBusy = isSaving || isDeleting

  /*
    Offered, never applied. The hook watches where the pin comes to rest, not
    where it is being dragged, and says nothing unless the geocoder disagrees
    with the name in the field.
  */
  const { suggestion, dismiss: dismissSuggestion } = useNameSuggestion({
    origin,
    settledAt,
    currentName: fields?.name ?? '',
  })

  const startEditing = useCallback(() => {
    if (!place) {
      return
    }
    startEdit(place)
    setErrors({})
    setSaveError(null)
    // The warning belonged to the panel as it was. Editing again is the user
    // acting on it, and a message about the last attempt would outlive its point.
    setDateFailed(false)
    setPanelMode('edit')
  }, [place, startEdit])

  const stopEditing = useCallback(() => {
    // Discards the draft, the moved pin with it: the map marker goes back to
    // the saved coordinates because that is the only place it was ever reading
    // them from.
    stopEdit()
    setErrors({})
    setSaveError(null)
    setPrompt('none')
    setPanelMode('read')
  }, [stopEdit])

  /**
   * Leaving the form, whether by Cancel, the close button, the sheet or Escape.
   * Asked only when there is something to lose — a confirmation on an untouched
   * form is how people learn to dismiss dialogues without reading them.
   */
  const requestStopEditing = useCallback(() => {
    if (isDirty) {
      setPrompt('discard')
      return
    }
    stopEditing()
  }, [isDirty, stopEditing])

  /** Closing the panel entirely. In edit mode, that means clearing the gate first. */
  const requestClose = useCallback(() => {
    if (panelMode === 'edit') {
      requestStopEditing()
      return
    }
    clear()
  }, [panelMode, requestStopEditing, clear])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') {
        return
      }
      if (isBusy) {
        // A request is in flight. There is nothing useful to do with the key,
        // and closing now would hide the message if it fails.
        return
      }
      if (prompt !== 'none') {
        // Escape backs out of the question, it does not answer it. Otherwise the
        // key that dismisses panels would also confirm a delete.
        setPrompt('none')
        return
      }
      if (isMovingPin) {
        // Out of the move step and back to the form, with the pin wherever it
        // has been dragged to. Escape steps back one level; it does not undo
        // the move, which is still unsaved and still cancellable from the form.
        stopMovingPin()
        return
      }
      requestClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [requestClose, prompt, isBusy, isMovingPin, stopMovingPin])

  const handleChange = (patch: Partial<PlaceDraft>) => {
    patchDraft(patch)
    // The save error belonged to the values as they were. Anything typed since
    // makes it stale, and a red line that outlives its cause is worse than none.
    setSaveError(null)
  }

  const handleSave = useCallback(async () => {
    if (!place || !fields || isBusy) {
      return
    }

    const found = validatePlaceDraft(fields)
    setErrors(found)
    if (hasErrors(found)) {
      return
    }

    setIsSaving(true)
    setSaveError(null)
    try {
      const outcome = await updatePlace(place.id, fields)
      // Back to the record, which is what was just written — the list already
      // holds the new values, so the panel and the marker change together. The
      // draft is dropped last: the saved place is now at the same coordinates
      // the draft pin was at, so the swap from edit pin to saved marker happens
      // without the pin visibly jumping.
      setPrompt('none')
      setPanelMode('read')
      setDateFailed(outcome === 'saved-without-date')
      stopEdit()
    } catch (error) {
      // The form stays open with what the user typed still in it. This is the
      // one failure where nothing was written at all.
      setSaveError(toSaveErrorKey(error))
    } finally {
      setIsSaving(false)
    }
  }, [place, fields, isBusy, updatePlace, stopEdit])

  const handleDelete = useCallback(async () => {
    if (!place || isBusy) {
      return
    }
    setIsDeleting(true)
    setDeleteError(null)
    try {
      await deletePlace(place.id)
      // The marker went the moment the request left. Closing here is the other
      // half of that: an optimistic delete leaves this panel describing a place
      // that is no longer on the map, and nothing else closes it.
      clear()
    } catch (error) {
      setDeleteError(toDeleteErrorKey(error))
      // Back to the panel, where the message is. Leaving the question up over
      // its own failure invites a second press at the thing that just failed.
      setPrompt('none')
    } finally {
      setIsDeleting(false)
    }
  }, [place, isBusy, deletePlace, clear])

  // Nothing selected, or the selection outlived its place — a delete from
  // another tab, or a reload that no longer returns it. Holding an id rather
  // than a copy is what turns that into "not found" instead of a panel
  // describing something that is gone.
  if (!place) {
    return null
  }

  const isEditing = panelMode === 'edit' && fields !== null

  const body = (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center justify-between gap-2">
        {/*
          The saved name, not the field's. The heading says which record is
          open, and a heading that changes as you type the new name is no longer
          answering that.
        */}
        <h2 className="font-display text-base font-bold text-text">{place.name}</h2>
        <button
          type="button"
          onClick={requestClose}
          disabled={isBusy}
          aria-label={isEditing ? t('detail.edit.close') : t('detail.close')}
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

      {isEditing ? (
        <PlaceForm
          mode="edit"
          draft={fields}
          layers={layers}
          errors={errors}
          disabled={isSaving}
          suggestion={
            suggestion
              ? {
                  name: suggestion,
                  // Accepting is typing it, as far as everything downstream is
                  // concerned: `toPlacePatch` sees a changed name and flips
                  // `source` to 'manual'. That is right — the user chose this
                  // name from an offer, which is a decision, not a prefill.
                  onAccept: () => {
                    handleChange({ name: suggestion })
                    dismissSuggestion()
                  },
                  onDismiss: dismissSuggestion,
                }
              : undefined
          }
          onChange={handleChange}
        />
      ) : (
        <PlaceForm mode="read" draft={placeToDraft(place)} layers={layers} />
      )}

      {/*
        Every message sits with the button that caused it. `role="alert"` so it
        is announced — they appear after a press, when focus is nowhere near them.
      */}
      {saveError && (
        <p role="alert" className="text-sm text-danger">
          {t(saveError)}
        </p>
      )}

      {deleteError && (
        <p role="alert" className="text-sm text-danger">
          {t(deleteError)}
        </p>
      )}

      {/*
        Not `danger`: nothing failed and nothing is lost. The name saved, and
        the date on screen is the one in the database — which is exactly what
        this line is for.
      */}
      {dateFailed && !isEditing && (
        <p role="alert" className="text-sm text-text-muted">
          {t('detail.edit.dateFailed')}
        </p>
      )}

      {/*
        How the pin is moved, which differs by surface for one reason: the sheet
        covers the map and the panel does not. On a fine pointer the pin is
        simply draggable where it stands, so this is a line telling the user so.
        On a coarse one it is a button, because the map has to be given back
        before anything can be dragged on it.
      */}
      {isEditing &&
        (isFinePointer ? (
          <p className="text-xs text-text-muted">{t('detail.move.dragHint')}</p>
        ) : (
          <button
            type="button"
            onClick={startMovingPin}
            disabled={isSaving}
            className="min-h-11 w-full rounded-full border border-border/60 px-4 text-sm text-text disabled:opacity-50"
          >
            {t('detail.move.action')}
          </button>
        ))}

      {isEditing ? (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={requestStopEditing}
            disabled={isSaving}
            className="min-h-11 flex-1 rounded-full border border-border/60 px-4 text-sm text-text disabled:opacity-50"
          >
            {t('detail.edit.cancel')}
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={isSaving}
            className="min-h-11 flex-1 rounded-full bg-accent px-4 text-sm font-medium text-surface transition-colors active:bg-accent-pressed disabled:opacity-50"
          >
            {isSaving ? t('detail.edit.saving') : t('detail.edit.save')}
          </button>
        </div>
      ) : (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={startEditing}
            disabled={isBusy}
            className="min-h-11 flex-1 rounded-full border border-border/60 px-4 text-sm text-text disabled:opacity-50"
          >
            {t('detail.edit.action')}
          </button>
          {/*
            Outlined in danger, not filled: this is the way in to the question,
            not the answer to it. The filled destructive button belongs to the
            prompt, where it is the thing that actually deletes.
          */}
          <button
            type="button"
            onClick={() => setPrompt('delete')}
            disabled={isBusy}
            className="min-h-11 flex-1 rounded-full border border-danger px-4 text-sm font-medium text-danger transition-colors disabled:opacity-50"
          >
            {t('detail.delete.action')}
          </button>
        </div>
      )}
    </div>
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
      {prompt === 'delete' && (
        <ConfirmPrompt
          title={t('detail.delete.title')}
          message={t('detail.delete.message', { name: place.name })}
          cancelLabel={t('detail.delete.cancel')}
          confirmLabel={t('detail.delete.confirm')}
          isBusy={isDeleting}
          onCancel={() => setPrompt('none')}
          onConfirm={() => void handleDelete()}
        />
      )}
      {prompt === 'discard' && (
        <ConfirmPrompt
          title={t('detail.edit.discard.title')}
          message={t('detail.edit.discard.message')}
          cancelLabel={t('detail.edit.discard.keep')}
          confirmLabel={t('detail.edit.discard.confirm')}
          onCancel={() => setPrompt('none')}
          onConfirm={stopEditing}
        />
      )}
    </>
  )

  /*
    The move step, on a coarse pointer only. The sheet is gone rather than
    collapsed: it covers 75% of the viewport, and a pin cannot be dragged
    somewhere that is not on screen. What is left is the map, the pin and one
    bar — and this component stays mounted throughout, which is what keeps
    Escape working while the panel itself is not rendered.
  */
  if (!isFinePointer && isMovingPin && isEditing) {
    return <MovePinBar />
  }

  if (isFinePointer) {
    return (
      <Panel className="pointer-events-auto relative flex w-[400px] flex-col overflow-hidden">
        <div className="min-h-0 flex-1 overflow-y-auto">{body}</div>
        {prompts}
      </Panel>
    )
  }

  return (
    <Sheet handleLabel={t('detail.sheetHandle')} onDismiss={requestClose} overlay={prompts}>
      {body}
    </Sheet>
  )
}

/** Literals, for the same reason as `SaveErrorKey`: a rename fails to compile. */
type DeleteErrorKey = 'detail.delete.failed' | 'detail.delete.failedUnauthenticated'

/** Repository failures as i18n keys. The panel never shows a raw error message. */
function toDeleteErrorKey(error: unknown): DeleteErrorKey {
  if (error instanceof RepositoryError && error.kind === 'unauthenticated') {
    // Worth telling apart: "could not be deleted" on an expired session is a
    // dead end, and signing in again is the way out of it.
    return 'detail.delete.failedUnauthenticated'
  }
  return 'detail.delete.failed'
}
