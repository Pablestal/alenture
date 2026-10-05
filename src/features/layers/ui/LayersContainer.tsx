import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronDown, Layers } from 'lucide-react'

import type { Layer } from '@/features/layers/domain/Layer'
import { useLayers } from '@/features/layers/state/useLayers'
import type { LayerErrorKey } from '@/features/layers/ui/layerErrorKey'
import { toLayerErrorKey } from '@/features/layers/ui/layerErrorKey'
import { LayersPanel } from '@/features/layers/ui/LayersPanel'
import { usePlaces } from '@/features/places/state/usePlaces'
import { useSelection } from '@/features/places/state/useSelection'
import { useIsFinePointer } from '@/shared/lib/useIsFinePointer'
import { ConfirmPrompt } from '@/shared/ui/ConfirmPrompt'
import { Panel } from '@/shared/ui/Panel'
import { Sheet } from '@/shared/ui/Sheet'

/**
 * The layers panel and the two frames it lives in. Bottom-left on both
 * surfaces, which is the corner `MapChrome` gives it.
 *
 * Fine pointer: a 320px panel, expanded, collapsing to its own header. There is
 * room for it to stand open and it is a thing you glance at while panning, so
 * it starts open.
 *
 * Coarse pointer: a 44px button, opening the sheet. The panel would cover a
 * third of a phone screen for the whole session, and the screen is the map.
 *
 * ## What changed when the panel became an index
 *
 * It used to be a card of filter rows with a `max-h-[60dvh]` cap, and that was
 * enough for a list bounded by how many years you have travelled. It now holds
 * every place you own, one layer at a time, so the cap is gone: the panel takes
 * whatever height the chrome column has left and scrolls inside it. What keeps
 * that from being a full-height sidebar in practice is that layers are
 * collapsed by default — see `LayerIndexSection`. Five layers is five rows.
 *
 * It stays a floating panel, inset from both edges, with the map running behind
 * and around it. There is never a fixed sidebar cropping the map.
 *
 * `Panel` and `Sheet` as they are — no new container primitive.
 */
export function LayersContainer() {
  const { t } = useTranslation('layers')
  const isFinePointer = useIsFinePointer()
  const { deleteLayer } = useLayers()
  const { unassignLayer } = usePlaces()
  const { selectedId } = useSelection()

  /*
    Two states, not one. They mean different things — a collapsed panel is still
    on screen and a closed sheet is not — and a device that flips from coarse to
    fine mid-session (a tablet meeting a keyboard) must not open a sheet because
    a panel was expanded.
  */
  const [isExpanded, setIsExpanded] = useState(true)
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const [isManaging, setIsManaging] = useState(false)
  /** The layer the confirmation is about, or null when nothing is being asked. */
  const [pendingDelete, setPendingDelete] = useState<Layer | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<LayerErrorKey | null>(null)

  const closeSheet = useCallback(() => setIsSheetOpen(false), [])

  /*
    A place got selected while the sheet was open — from the index inside it, or
    from a marker in the quarter of the map the sheet leaves visible. Either way
    the detail sheet is about to take the bottom of the screen, and two sheets
    cannot share it.

    Watching the selection rather than taking a callback from the index: a
    marker press has to close this too, and that is not something the index
    could have told us about.

    Fine pointers are exempt. There the two are a bottom-left panel and a
    right-hand one — they do not collide, and an index that closed itself every
    time you looked something up would be an index you could use once.
  */
  useEffect(() => {
    if (!isFinePointer && selectedId !== null) {
      setIsSheetOpen(false)
    }
  }, [isFinePointer, selectedId])

  const handleDelete = useCallback(async () => {
    if (!pendingDelete || isDeleting) {
      return
    }
    setIsDeleting(true)
    setDeleteError(null)
    try {
      await deleteLayer(pendingDelete.id)
      // Only now, and only here. The database has already unassigned the places
      // — atomically, inside `delete_layer` — and this is the local half of it.
      // See `unassignLayer` for why `LayersProvider` does not do it itself.
      unassignLayer(pendingDelete.id)
      setPendingDelete(null)
    } catch (error) {
      setDeleteError(toLayerErrorKey(error))
      // Back to the panel, where the message is. Leaving the question up over
      // its own failure invites a second press at the thing that just failed.
      setPendingDelete(null)
    } finally {
      setIsDeleting(false)
    }
  }, [pendingDelete, isDeleting, deleteLayer, unassignLayer])

  useEffect(() => {
    if (!isSheetOpen && !pendingDelete) {
      return
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') {
        return
      }
      if (isDeleting) {
        // A request is in flight. There is nothing useful to do with the key,
        // and closing now would hide the message if it fails.
        return
      }
      if (pendingDelete) {
        // Escape backs out of the question, it does not answer it. Otherwise
        // the key that dismisses panels would also confirm a delete.
        setPendingDelete(null)
        return
      }
      closeSheet()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isSheetOpen, pendingDelete, isDeleting, closeSheet])

  const panel = (
    <LayersPanel
      deleteError={deleteError ? t(deleteError) : undefined}
      isManaging={isManaging}
      onToggleManaging={() => setIsManaging((current) => !current)}
      onRequestDelete={(layer) => {
        setDeleteError(null)
        setPendingDelete(layer)
      }}
    />
  )

  /*
    The one question in this panel, and the message it has to carry is the whole
    point of it: the places SURVIVE. A layer is an organising scheme, and
    deleting one throws away the filing, not the things filed — but "Delete
    Houses?" over a map of pins reads exactly like "delete these twelve places",
    which is the misunderstanding that costs a user their afternoon.
  */
  const prompt = pendingDelete && (
    <ConfirmPrompt
      title={t('manage.deletePrompt.title')}
      message={t('manage.deletePrompt.message', { name: pendingDelete.name })}
      cancelLabel={t('manage.deletePrompt.cancel')}
      confirmLabel={t('manage.deletePrompt.confirm')}
      isBusy={isDeleting}
      onCancel={() => setPendingDelete(null)}
      onConfirm={() => void handleDelete()}
    />
  )

  if (isFinePointer) {
    return (
      /*
        `min-h-0` and no explicit height: the panel is as tall as its content
        until the chrome column runs out of room, and then it stops and the list
        inside scrolls. `relative`, so the prompt below can cover it — and the
        prompt is a sibling of the scroller rather than a child, because
        `absolute inset-0` inside a scrolled element pins it to the top of the
        content instead of the top of the panel. `Sheet` says the same.
      */
      <Panel className="pointer-events-auto relative flex min-h-0 w-80 flex-col overflow-hidden">
        <button
          type="button"
          onClick={() => setIsExpanded((current) => !current)}
          aria-expanded={isExpanded}
          className="flex min-h-11 w-full shrink-0 items-center justify-between gap-2 px-4 text-left"
        >
          <span className="font-display text-xs tracking-[0.12em] text-text uppercase">
            {t('title')}
          </span>
          <ChevronDown
            aria-hidden="true"
            focusable="false"
            // Rotates rather than swapping icons: the chevron points at what
            // pressing it does, and one element turning says the two states are
            // the same control.
            className={`size-4 shrink-0 text-text-muted transition-transform ${
              isExpanded ? '' : '-rotate-90'
            }`}
          />
        </button>
        {/*
          Unmounted when collapsed, not hidden. The rows are buttons — left in
          the DOM they would stay in the tab order behind a header that says
          they are put away.
        */}
        {isExpanded && <div className="min-h-0 overflow-y-auto">{panel}</div>}
        {isExpanded && prompt}
      </Panel>
    )
  }

  if (!isSheetOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsSheetOpen(true)}
        aria-label={t('open')}
        aria-haspopup="dialog"
        className="pointer-events-auto flex size-11 shrink-0 items-center justify-center rounded-full border border-border/60 bg-surface/85 text-text backdrop-blur-md"
      >
        <Layers aria-hidden="true" focusable="false" className="size-5" />
      </button>
    )
  }

  /*
    Fixed to the viewport rather than laid out in the chrome column: the sheet
    spans the full width and owns the bottom of the screen, and the column it
    was launched from is 44px wide in a corner.

    No scrim, and none wanted — `Sheet` explains why. The map stays live behind
    it, which is the point of a panel that filters the map: you tick a layer off
    and watch the markers go.
  */
  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-label={t('title')}
      className="pointer-events-none fixed inset-x-0 bottom-0 z-10 flex justify-center"
    >
      <Sheet handleLabel={t('sheetHandle')} onDismiss={closeSheet} overlay={prompt}>
        {panel}
      </Sheet>
    </div>
  )
}
