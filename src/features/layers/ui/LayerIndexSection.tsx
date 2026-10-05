import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus } from 'lucide-react'

import type { Layer } from '@/features/layers/domain/Layer'
import { useFlyToPlace } from '@/features/layers/hooks/useFlyToPlace'
import { useLayerIndex } from '@/features/layers/hooks/useLayerIndex'
import { useLayers } from '@/features/layers/state/useLayers'
import { useMapView } from '@/features/layers/state/useMapView'
import type { LayerErrorKey } from '@/features/layers/ui/layerErrorKey'
import { toLayerErrorKey } from '@/features/layers/ui/layerErrorKey'
import { LayerNameForm } from '@/features/layers/ui/LayerNameForm'
import { LayerRow } from '@/features/layers/ui/LayerRow'
import { PlaceIndexRow } from '@/features/layers/ui/PlaceIndexRow'
import { useSelection } from '@/features/places/state/useSelection'

/** The key the Unassigned group is remembered by. It has no id of its own. */
const UNASSIGNED_KEY = '\u0000unassigned'

interface LayerIndexSectionProps {
  /**
   * A failure that happened outside this component — today, a delete, which is
   * confirmed and carried out by the frame. Rendered on the same alert line as
   * this section's own failures rather than in a second one: from the user's
   * side there is one panel and one thing that just went wrong in it.
   */
  externalError?: string | undefined
  isManaging: boolean
  onToggleManaging(): void
  /**
   * Raised rather than handled here: the confirmation covers the whole panel,
   * and the panel's frame is what owns it. See `LayersContainer`.
   */
  onRequestDelete(layer: Layer): void
}

/**
 * The layers, and the places under each one. The top of the panel, and the
 * reason the panel is now an index rather than a card.
 *
 * ## Collapsed by default, and not remembered
 *
 * Every layer starts closed, on every open and after every reload. That is what
 * keeps the panel proportional to the number of LAYERS rather than the number
 * of places: five layers is five rows whether they hold four places or four
 * hundred, and the scrollable list only exists once you have asked for one.
 *
 * Not persisted for the same reason the filters are not — see `mapViewContext`.
 * A session that came back with four layers open would have the user scrolling
 * past somebody else's decision to find the row they wanted.
 *
 * ## Manage mode
 *
 * Renaming, reordering and deleting live behind one toggle, so the resting row
 * stays the two controls that get used constantly. `LayerRow` explains why they
 * take turns rather than sharing the row.
 *
 * Creating is not behind it. With no layers at all the section is otherwise
 * empty, and hiding the only way out of an empty state behind a mode is how an
 * empty state becomes a dead end.
 */
export function LayerIndexSection({
  externalError,
  isManaging,
  onToggleManaging,
  onRequestDelete,
}: LayerIndexSectionProps) {
  const { t } = useTranslation('layers')
  const { layers, createLayer, renameLayer, moveLayer } = useLayers()
  const { filters, toggleLayer } = useMapView()
  const { selectedId } = useSelection()
  const groups = useLayerIndex()
  const flyToPlace = useFlyToPlace()

  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set())
  const [isCreating, setIsCreating] = useState(false)
  /** The layer whose name is being edited, or null. At most one at a time. */
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [isBusy, setIsBusy] = useState(false)
  const [error, setError] = useState<LayerErrorKey | null>(null)

  const toggleExpanded = useCallback((key: string) => {
    setExpanded((current) => {
      const next = new Set(current)
      if (!next.delete(key)) {
        next.add(key)
      }
      return next
    })
  }, [])

  /**
   * Every write goes through here so that "in flight", "what went wrong" and
   * "the form closes on success but stays open on failure" are decided once
   * rather than four times.
   */
  const run = useCallback(async (write: () => Promise<unknown>): Promise<boolean> => {
    setIsBusy(true)
    setError(null)
    try {
      await write()
      return true
    } catch (caught) {
      setError(toLayerErrorKey(caught))
      return false
    } finally {
      setIsBusy(false)
    }
  }, [])

  const handleCreate = async (name: string) => {
    // The row is already in the list — `createLayer` put it there before the
    // request went out — so on success there is nothing to do but close.
    if (await run(() => createLayer(name))) {
      setIsCreating(false)
    }
  }

  const handleRename = async (id: string, name: string) => {
    if (await run(() => renameLayer(id, name))) {
      setRenamingId(null)
    }
  }

  /*
    The failure with nowhere better to go. While a name form is open it renders
    that failure itself, under the field that caused it; what is left over is a
    reorder, or a delete that failed after its prompt had closed, and those have
    no control of their own to sit beneath.
  */
  const isFormOpen = isCreating || renamingId !== null
  const looseError = externalError ?? (error && !isFormOpen ? t(error) : null)

  return (
    <section className="flex flex-col gap-1">
      <div className="flex items-center justify-between gap-2 px-2 pb-1">
        <h3 className="font-display text-xs tracking-[0.12em] text-text-muted uppercase">
          {t('index.title')}
        </h3>
        {/*
          Only offered when there is something to manage. With no layers the
          button would toggle a mode that changes nothing about an empty list.
        */}
        {layers.length > 0 && (
          <button
            type="button"
            onClick={() => {
              onToggleManaging()
              // Leaving the mode abandons whatever it had open. A rename field
              // left standing after "Done" would be an edit the user believes
              // they have closed.
              setRenamingId(null)
              setError(null)
            }}
            aria-pressed={isManaging}
            className="min-h-11 shrink-0 rounded-lg px-2 text-xs text-text-muted transition-colors hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text"
          >
            {isManaging ? t('manage.done') : t('manage.action')}
          </button>
        )}
      </div>

      {/*
        No layers yet — which is not the same as no groups, and the difference is
        the case that matters. A user with thirty places and no layers gets an
        Unassigned row, so keying this off `groups` would hide the explainer from
        exactly the person who needs it. One sentence saying what a layer is FOR,
        because the word alone does not say it, and this is the only place the
        app ever gets to explain the idea.
      */}
      {layers.length === 0 && !isCreating && (
        <p className="px-2 pb-2 text-xs text-text-muted">{t('index.empty')}</p>
      )}

      {groups.map(({ layer, places }) => {
        const key = layer?.id ?? UNASSIGNED_KEY
        const label = layer?.name ?? t('index.unassigned')
        const isExpanded = expanded.has(key)
        const index = layer ? layers.findIndex((candidate) => candidate.id === layer.id) : -1

        if (layer && renamingId === layer.id) {
          return (
            <LayerNameForm
              key={key}
              initialName={layer.name}
              submitLabel={t('manage.renameSubmit')}
              submitError={error ? t(error) : undefined}
              isBusy={isBusy}
              onSubmit={(name) => void handleRename(layer.id, name)}
              onCancel={() => {
                setRenamingId(null)
                setError(null)
              }}
            />
          )
        }

        return (
          <div key={key} className="flex flex-col">
            <LayerRow
              label={label}
              count={places.length}
              isVisible={!filters.hiddenLayers.has(layer?.id ?? null)}
              isExpanded={isExpanded}
              isManageable={layer !== null}
              isManaging={isManaging}
              canMoveUp={index > 0}
              canMoveDown={index !== -1 && index < layers.length - 1}
              isBusy={isBusy}
              onToggleExpanded={() => toggleExpanded(key)}
              onToggleVisible={() => toggleLayer(layer?.id ?? null)}
              onRename={() => {
                setRenamingId(layer?.id ?? null)
                setError(null)
              }}
              onMove={(direction) => {
                if (layer) {
                  void run(() => moveLayer(layer.id, direction))
                }
              }}
              onDelete={() => {
                if (layer) {
                  setError(null)
                  onRequestDelete(layer)
                }
              }}
            />

            {/*
              Unmounted when collapsed, not hidden. The rows are buttons — left
              in the DOM they would stay in the tab order behind a chevron that
              says they are put away. The panel header does the same.
            */}
            {isExpanded &&
              (places.length === 0 ? (
                <p className="py-2 pr-2 pl-9 text-xs text-text-muted">
                  {t('index.layerEmpty')}
                </p>
              ) : (
                places.map((place) => (
                  <PlaceIndexRow
                    key={place.id}
                    place={place}
                    isSelected={place.id === selectedId}
                    onSelect={() => flyToPlace(place)}
                  />
                ))
              ))}
          </div>
        )
      })}

      {isCreating ? (
        <LayerNameForm
          initialName=""
          submitLabel={t('manage.createSubmit')}
          submitError={error ? t(error) : undefined}
          isBusy={isBusy}
          onSubmit={(name) => void handleCreate(name)}
          onCancel={() => {
            setIsCreating(false)
            setError(null)
          }}
        />
      ) : (
        <button
          type="button"
          onClick={() => {
            setIsCreating(true)
            setRenamingId(null)
            setError(null)
          }}
          disabled={isBusy}
          className="flex min-h-11 w-full items-center gap-2 rounded-lg px-2 text-left text-sm text-text-muted transition-colors hover:text-text active:bg-surface-raised disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text"
        >
          <Plus aria-hidden="true" focusable="false" className="size-4 shrink-0" />
          {t('manage.create')}
        </button>
      )}

      {/*
        The failures with no form of their own to sit under — a reorder, or a
        delete that failed after its prompt closed. `role="alert"` because they
        appear after a press, when focus is nowhere near them.
      */}
      {looseError && (
        <p role="alert" className="px-2 pt-1 text-xs text-danger">
          {looseError}
        </p>
      )}
    </section>
  )
}
