import type { ReactNode } from 'react'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { useAuth } from '@/features/auth/state/useAuth'
import type { LayersRepository } from '@/features/layers/data/LayersRepository'
import type { Layer } from '@/features/layers/domain/Layer'
import { nextSort } from '@/features/layers/domain/Layer'
import { sortLayers } from '@/features/layers/domain/layerIndex'
import type {
  LayerDirection,
  LayersContextValue,
  LayersStatus,
} from '@/features/layers/state/layersContext'
import { LayersContext } from '@/features/layers/state/layersContext'
import { RepositoryError } from '@/features/places/data/RepositoryError'

interface LayersProviderProps {
  children: ReactNode
  /**
   * Required, and never defaulted to the Supabase implementation: this module
   * must stay ignorant of which backend it is talking to. `AppProviders` owns
   * the choice, exactly as it does for places.
   */
  repository: LayersRepository
}

/**
 * The user's layers, loaded once per session and written through optimistically.
 *
 * Every mutation follows the same shape as `PlacesProvider`: change the array
 * first so the panel moves under the user's finger, then send the request, then
 * put the old value back if it fails. A panel that waits for a round trip to
 * show a renamed row is a panel that feels broken on a train.
 */
export function LayersProvider({ children, repository }: LayersProviderProps) {
  const { status: authStatus, user } = useAuth()
  const [layers, setLayers] = useState<Layer[]>([])
  const [status, setStatus] = useState<LayersStatus>('idle')
  // Bumped by `refresh`. Not state the UI reads — only a reason to re-run the
  // effect, which keeps the fetch and its cancellation in one place.
  const [reloadToken, setReloadToken] = useState(0)

  const userId = user?.id ?? null

  useEffect(() => {
    // Auth has not spoken yet. Fetching now would hit RLS with no session and
    // come back as an empty list — a successful-looking answer that is wrong.
    if (authStatus === 'loading') {
      return
    }

    if (authStatus === 'anonymous') {
      setLayers([])
      setStatus('idle')
      return
    }

    let active = true
    setStatus('loading')

    repository
      .list()
      .then((result) => {
        // A sign-out, an account switch or a newer refresh landed while this
        // request was in flight. Its rows belong to a state we have left.
        if (!active) {
          return
        }
        setLayers(sortLayers(result))
        setStatus('ready')
      })
      .catch(() => {
        if (!active) {
          return
        }
        // Cleared rather than left stale, matching the places list: the panel
        // would otherwise offer the previous user's layers to file into.
        setLayers([])
        setStatus('error')
      })

    return () => {
      active = false
    }
  }, [repository, authStatus, userId, reloadToken])

  const refresh = useCallback(() => {
    setReloadToken((token) => token + 1)
  }, [])

  const createLayer = useCallback(
    async (name: string): Promise<Layer> => {
      // Only ever used to find the optimistic entry again. It never reaches the
      // database, which mints the real id itself.
      const optimisticId = crypto.randomUUID()
      const now = new Date()
      // Read from state, not computed inside the updater. An updater must stay
      // pure and React invokes it twice in development, so assigning `sort` out
      // of one would compute it against a list that already contains the row
      // being added — filing every new layer one place further down than asked.
      const sort = nextSort(layers)

      const optimistic: Layer = {
        id: optimisticId,
        name: name.trim(),
        sort,
        createdAt: now,
        updatedAt: now,
      }
      setLayers((current) => [...current, optimistic])

      try {
        const created = await repository.create({ name, sort })
        // Replaced rather than removed and re-added, so the row never blinks
        // out between the two.
        setLayers((current) =>
          sortLayers(current.map((layer) => (layer.id === optimisticId ? created : layer))),
        )
        return created
      } catch (error) {
        setLayers((current) => current.filter((layer) => layer.id !== optimisticId))
        throw error
      }
    },
    [layers, repository],
  )

  const renameLayer = useCallback(
    async (id: string, name: string): Promise<void> => {
      // Read straight from state rather than inside the setter: an updater must
      // stay pure, and React invokes it twice in development — the second pass
      // would hand back the optimistic layer as the original, so a rollback
      // would restore the very value it is meant to undo.
      const original = layers.find((layer) => layer.id === id)
      if (!original) {
        throw RepositoryError.notFound('Layer')
      }

      const trimmed = name.trim()
      setLayers((current) =>
        current.map((layer) => (layer.id === id ? { ...layer, name: trimmed } : layer)),
      )

      try {
        const stored = await repository.update(id, { name: trimmed })
        setLayers((current) => current.map((layer) => (layer.id === id ? stored : layer)))
      } catch (error) {
        setLayers((current) => current.map((layer) => (layer.id === id ? original : layer)))
        throw error
      }
    },
    [layers, repository],
  )

  const moveLayer = useCallback(
    async (id: string, direction: LayerDirection): Promise<void> => {
      const ordered = sortLayers(layers)
      const index = ordered.findIndex((layer) => layer.id === id)
      const target = ordered[index]
      const neighbourIndex = direction === 'up' ? index - 1 : index + 1
      const neighbour = ordered[neighbourIndex]

      // Already at the end it is being pushed towards, or gone. The arrows are
      // disabled there, so this is the race rather than the ordinary case.
      if (index === -1 || !target || !neighbour) {
        return
      }

      /*
       * The two rows trade places rather than the whole list being renumbered.
       * Renumbering would be N writes to move one row, and every one of them a
       * chance to half-fail; this is two.
       *
       * ## The failure this accepts, chosen rather than overlooked
       *
       * The two writes are not atomic, and there is no `swap_layer_sort()` to
       * make them so. If the first lands and the second does not, two layers
       * end up sharing a `sort`. `sortLayers` breaks that tie by `createdAt`,
       * so the list is WRONG BUT STABLE — it does not reshuffle between
       * renders, which is the failure that would be unexplainable to the person
       * looking at it — and pressing the arrow again resolves it, because the
       * branch below deliberately handles the equal-`sort` case.
       *
       * That is the whole reason this is not a function like `delete_layer`.
       * There, a partial failure silently discards work the user did; here it
       * costs one more press of a button that is already under their finger,
       * and the state it leaves behind is legible. Weigh it that way if the
       * reorder ever grows a second write.
       *
       * When the two already share a `sort` — the residue of an earlier failed
       * swap — trading the values would be a no-op that looks like a broken
       * button. So the target takes its neighbour's value and the neighbour is
       * pushed past it, which reorders them under `createdAt` either way.
       */
      const targetSort = neighbour.sort
      const neighbourSort =
        target.sort === neighbour.sort
          ? direction === 'up'
            ? neighbour.sort + 1
            : neighbour.sort - 1
          : target.sort

      setLayers((current) =>
        sortLayers(
          current.map((layer) => {
            if (layer.id === target.id) return { ...layer, sort: targetSort }
            if (layer.id === neighbour.id) return { ...layer, sort: neighbourSort }
            return layer
          }),
        ),
      )

      const restore = () => {
        setLayers((current) =>
          sortLayers(
            current.map((layer) => {
              if (layer.id === target.id) return target
              if (layer.id === neighbour.id) return neighbour
              return layer
            }),
          ),
        )
      }

      try {
        await repository.update(target.id, { sort: targetSort })
      } catch (error) {
        restore()
        throw error
      }

      try {
        await repository.update(neighbour.id, { sort: neighbourSort })
      } catch (error) {
        // Half the swap landed. Putting the first row back is a third write
        // that can fail just as easily, so what is restored is the state, not
        // the database: the list re-sorts to what is actually stored, and the
        // panel then shows the order the user would see on reload rather than
        // one only this session believes in.
        setLayers((current) =>
          sortLayers(
            current.map((layer) => (layer.id === neighbour.id ? neighbour : layer)),
          ),
        )
        throw error
      }
    },
    [layers, repository],
  )

  const deleteLayer = useCallback(
    async (id: string): Promise<void> => {
      // Kept so the row can go back exactly where it was — `sort` alone would
      // not restore it if the failure came after some other reorder.
      const original = layers.find((layer) => layer.id === id)
      if (!original) {
        throw RepositoryError.notFound('Layer')
      }

      setLayers((current) => current.filter((layer) => layer.id !== id))

      try {
        await repository.remove(id)
      } catch (error) {
        setLayers((current) => sortLayers([...current, original]))
        throw error
      }
    },
    [layers, repository],
  )

  const value = useMemo<LayersContextValue>(
    () => ({ layers, status, refresh, createLayer, renameLayer, moveLayer, deleteLayer }),
    [layers, status, refresh, createLayer, renameLayer, moveLayer, deleteLayer],
  )

  return <LayersContext value={value}>{children}</LayersContext>
}
