import type { ReactNode } from 'react'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { useAuth } from '@/features/auth/state/useAuth'
import type { PlacesRepository } from '@/features/places/data/PlacesRepository'
import type { VisitsRepository } from '@/features/places/data/VisitsRepository'
import type { Place, PlaceWithStats } from '@/features/places/domain/Place'
import type { PlaceDraft } from '@/features/places/domain/placeDraft'
import { toNewPlace, toNewVisit } from '@/features/places/domain/placeDraft'
import { parseDateOnly } from '@/features/places/domain/dateOnly'
import { isEmptyPatch, toPlacePatch } from '@/features/places/domain/placePatch'
import { resolveVisitChange } from '@/features/places/domain/visitChange'
import { RepositoryError } from '@/features/places/data/RepositoryError'
import type {
  PlaceUpdateOutcome,
  PlacesContextValue,
  PlacesStatus,
} from '@/features/places/state/placesContext'
import { PlacesContext } from '@/features/places/state/placesContext'

interface PlacesProviderProps {
  children: ReactNode
  /**
   * Required, and never defaulted to the Supabase implementation: this module
   * must stay ignorant of which backend it is talking to. `AppProviders` owns
   * the choice.
   */
  repository: PlacesRepository
  visitsRepository: VisitsRepository
}

/**
 * The optimistic marker, before the database has said anything. Its id is a
 * placeholder — the real one is minted by the repository — and it is swapped
 * for the stored place once every write has landed.
 */
function toOptimisticPlace(id: string, draft: PlaceDraft): PlaceWithStats {
  const now = new Date()
  const visit = toNewVisit(draft, id)
  /*
   * `source` is dropped rather than spread through, and the compiler will not
   * tell you it needs to be: excess-property checking does not fire through a
   * spread. `{ id, ...toNewPlace(draft), … }` compiles clean even though
   * `NewPlace` carries a `source` that `PlaceWithStats` does not, where writing
   * `source:` directly in the same literal is an error. Without this line the
   * optimistic place would carry a field at runtime that its own type denies.
   *
   * Not a quirk of this function. Every site that builds a domain object by
   * spreading a wider one has the same hole, so a field added to the source
   * type arrives silently in objects that never declared it.
   */
  const { source: _source, ...place } = toNewPlace(draft)
  return {
    id,
    ...place,
    createdAt: now,
    updatedAt: now,
    // The figures the place would have if both writes succeed, which is the
    // assumption an optimistic update is making anyway.
    visitCount: visit ? 1 : 0,
    firstVisit: visit ? visit.startedOn : null,
    lastVisit: visit ? visit.startedOn : null,
  }
}

function toStoredPlace(place: Place, draft: PlaceDraft): PlaceWithStats {
  const hasVisit = draft.startedOn !== ''
  const visitDate = hasVisit ? parseDateOnly(draft.startedOn) : null
  return {
    ...place,
    visitCount: hasVisit ? 1 : 0,
    firstVisit: visitDate,
    lastVisit: visitDate,
  }
}

/**
 * The place as the list should show it the moment Save is pressed.
 *
 * The visit figures move only when the date did, so a name-only edit leaves
 * them exactly as the view computed them. Where they do move, they move to the
 * figures of a place with one visit or none — which is what the form can
 * express, and the assumption this whole screen already makes.
 */
function toEditedPlace(place: PlaceWithStats, draft: PlaceDraft): PlaceWithStats {
  const patch = toPlacePatch(place, draft)
  const edited: PlaceWithStats = {
    ...place,
    ...(patch.name === undefined ? {} : { name: patch.name }),
    ...(patch.notes === undefined ? {} : { notes: patch.notes }),
    // The panel's index regroups off this the instant Save is pressed, so a
    // refiled place moves to its new layer without waiting for a round trip.
    ...(patch.layerId === undefined ? {} : { layerId: patch.layerId }),
    // The marker reads its position from here, so this is what moves the pin
    // the instant Save is pressed rather than a round trip later.
    ...(patch.lat === undefined ? {} : { lat: patch.lat }),
    ...(patch.lng === undefined ? {} : { lng: patch.lng }),
    // Only when the row itself is going to be written. A date-only edit sends
    // no update to `places`, so its `updated_at` does not move — and claiming
    // otherwise here would put a timestamp in state that the database disagrees
    // with, silently, for as long as the session lasts.
    ...(isEmptyPatch(patch) ? {} : { updatedAt: new Date() }),
  }

  const change = resolveVisitChange(place, draft)
  if (change === 'none') {
    return edited
  }
  if (change === 'clear') {
    return { ...edited, visitCount: 0, firstVisit: null, lastVisit: null }
  }
  const visitDate = parseDateOnly(draft.startedOn)
  return { ...edited, visitCount: 1, firstVisit: visitDate, lastVisit: visitDate }
}

export function PlacesProvider({ children, repository, visitsRepository }: PlacesProviderProps) {
  const { status: authStatus, user } = useAuth()
  const [places, setPlaces] = useState<PlaceWithStats[]>([])
  const [status, setStatus] = useState<PlacesStatus>('idle')
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
      setPlaces([])
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
        setPlaces(result)
        setStatus('ready')
      })
      .catch(() => {
        if (!active) {
          return
        }
        // The list is cleared rather than left stale: an error panel over the
        // previous user's markers would be worse than an empty map.
        setPlaces([])
        setStatus('error')
      })

    return () => {
      active = false
    }
  }, [repository, authStatus, userId, reloadToken])

  const refresh = useCallback(() => {
    setReloadToken((token) => token + 1)
  }, [])

  const createPlace = useCallback(
    async (draft: PlaceDraft): Promise<PlaceWithStats> => {
      // Only ever used to find the optimistic entry again. It never reaches the
      // database, which mints the real id itself.
      const optimisticId = crypto.randomUUID()
      const optimistic = toOptimisticPlace(optimisticId, draft)

      // Newest first, matching the order `list()` returns.
      setPlaces((current) => [optimistic, ...current])

      const dropOptimistic = () => {
        setPlaces((current) => current.filter((place) => place.id !== optimisticId))
      }

      let created: Place
      try {
        created = await repository.create(toNewPlace(draft))
      } catch (error) {
        dropOptimistic()
        throw error
      }

      const newVisit = toNewVisit(draft, created.id)
      if (newVisit) {
        try {
          await visitsRepository.create(newVisit)
        } catch (error) {
          // Both writes or neither. A place carrying a visit that was never
          // recorded is worse than no place at all, so the place goes back.
          dropOptimistic()
          try {
            // TODO: this is a soft delete, so the rolled-back place survives as
            // a tombstone and will appear in any future export or incremental
            // sync. A hard delete is arguably right here — unlike a place the
            // user deliberately deleted, this row was never observed by anyone,
            // so there is no history worth keeping. Left soft for now because
            // `remove` is the only delete the repository exposes.
            await repository.remove(created.id)
          } catch (rollbackError) {
            // The original error is what the user is told — it is the one that
            // explains why nothing was saved. This is logged and not retried:
            // a retry loop against a backend that is already failing makes the
            // situation worse, and the id is what makes the row findable later.
            console.error(
              `Rollback failed; place ${created.id} exists with no visit`,
              rollbackError,
            )
          }
          throw error
        }
      }

      // Everything landed. The placeholder is replaced rather than removed and
      // re-added, so the marker never blinks out between the two.
      const stored = toStoredPlace(created, draft)
      setPlaces((current) =>
        current.map((place) => (place.id === optimisticId ? stored : place)),
      )
      return stored
    },
    [repository, visitsRepository],
  )

  const deletePlace = useCallback(
    async (id: string): Promise<void> => {
      // Kept so the marker can go back exactly where it was. Removing and
      // re-prepending on failure would reorder the list against `created_at`,
      // which is a second, silent thing going wrong.
      let removed: { place: PlaceWithStats; index: number } | null = null
      setPlaces((current) => {
        const index = current.findIndex((place) => place.id === id)
        const place = current[index]
        if (index === -1 || !place) {
          return current
        }
        removed = { place, index }
        return current.filter((entry) => entry.id !== id)
      })

      try {
        await repository.remove(id)
      } catch (error) {
        if (removed) {
          const { place, index } = removed
          setPlaces((current) => {
            const restored = [...current]
            restored.splice(index, 0, place)
            return restored
          })
        }
        throw error
      }

      try {
        await visitsRepository.removeByPlace(id)
      } catch (error) {
        // Deliberately swallowed. The place is gone and stays gone: putting it
        // back because its visits survived would resurrect something the user
        // watched disappear, to fix rows nothing reads. Logged with the id,
        // which is what makes them findable when a timeline does read them.
        console.error(`Place ${id} deleted; its visits were not`, error)
      }
    },
    [repository, visitsRepository],
  )

  const unassignLayer = useCallback((layerId: string): void => {
    setPlaces((current) =>
      current.map((place) => (place.layerId === layerId ? { ...place, layerId: null } : place)),
    )
  }, [])

  const updatePlace = useCallback(
    async (id: string, draft: PlaceDraft): Promise<PlaceUpdateOutcome> => {
      // Read straight from state rather than inside the setter: an updater must
      // stay pure, and React invokes it twice in development — the second pass
      // would hand back the optimistic place as the original, so a rollback
      // would restore the very values it is meant to undo. `places` is already
      // in the context memo's dependencies, so closing over it costs nothing.
      const original = places.find((place) => place.id === id)
      if (!original) {
        // Gone between opening the panel and pressing Save.
        throw RepositoryError.notFound('Place')
      }

      const patch = toPlacePatch(original, draft)
      const change = resolveVisitChange(original, draft)

      const edited = toEditedPlace(original, draft)
      setPlaces((current) => current.map((place) => (place.id === id ? edited : place)))

      const restore = (place: PlaceWithStats) => {
        setPlaces((current) => current.map((entry) => (entry.id === id ? place : entry)))
      }

      // Skipped outright when only the date moved. An update naming no columns
      // would still touch `updated_at`, which would say the place changed when
      // nothing about the place did.
      if (!isEmptyPatch(patch)) {
        try {
          const stored = await repository.update(id, patch)
          // The stored row wins for what it owns, and the optimistic figures
          // stand for what it does not: `update` returns a `Place`, which
          // carries no visit statistics.
          setPlaces((current) =>
            current.map((place) =>
              place.id === id ? { ...edited, ...stored } : place,
            ),
          )
        } catch (error) {
          restore(original)
          throw error
        }
      }

      /*
       * The whole visit side, skipped when the date did not move — see the note
       * on `resolveVisitChange`. This is the common edit, and it stays a single
       * request because of this branch.
       */
      if (change === 'none') {
        return 'saved'
      }

      try {
        if (change === 'clear') {
          await visitsRepository.removeByPlace(id)
        } else if (change === 'create') {
          const created = toNewVisit(draft, id)
          if (created) {
            await visitsRepository.create(created)
          }
        } else {
          // Which visit the form was editing is a question only this layer can
          // answer: the repository returns all of them, and it is the form
          // showing exactly one — the most recent — that picks this row.
          const visits = await visitsRepository.listByPlace(id)
          const latest = visits.at(-1)
          const startedOn = parseDateOnly(draft.startedOn)
          if (latest) {
            await visitsRepository.update(latest.id, { startedOn })
          } else {
            // The panel showed a date and the table has no visit to carry it.
            // The date the user is looking at is the one they mean, so it is
            // written rather than reported as a conflict they cannot act on.
            const created = toNewVisit(draft, id)
            if (created) {
              await visitsRepository.create(created)
            }
          }
        }
      } catch (error) {
        // The place keeps its edit — it saved, and discarding a successful
        // write because a second one failed would throw away work the user did.
        // Only the figures the visit would have changed go back, so the panel
        // shows the date that is actually stored.
        setPlaces((current) =>
          current.map((place) =>
            place.id === id
              ? {
                  ...place,
                  visitCount: original.visitCount,
                  firstVisit: original.firstVisit,
                  lastVisit: original.lastVisit,
                }
              : place,
          ),
        )
        console.error(`Place ${id} saved; its date did not`, error)
        return 'saved-without-date'
      }

      return 'saved'
    },
    [places, repository, visitsRepository],
  )

  const value = useMemo<PlacesContextValue>(
    () => ({ places, status, refresh, createPlace, deletePlace, updatePlace, unassignLayer }),
    [places, status, refresh, createPlace, deletePlace, updatePlace, unassignLayer],
  )

  return <PlacesContext value={value}>{children}</PlacesContext>
}
