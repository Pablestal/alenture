import type { ReactNode } from 'react'
import { useCallback, useMemo, useState } from 'react'

import type { Coordinates } from '@/features/places/domain/coordinates'
import type { PlaceWithStats } from '@/features/places/domain/Place'
import type { PlaceDraft } from '@/features/places/domain/placeDraft'
import { placeToDraft } from '@/features/places/domain/placeToDraft'
import type { PlaceEditContextValue } from '@/features/places/state/placeEditContext'
import { PlaceEditContext } from '@/features/places/state/placeEditContext'

/**
 * Holds one draft at a time. There is one panel and one selected place, so
 * "which place is being edited" is a single id and not a map.
 */
export function PlaceEditProvider({ children }: { children: ReactNode }) {
  const [placeId, setPlaceId] = useState<string | null>(null)
  const [draft, setDraft] = useState<PlaceDraft | null>(null)
  const [origin, setOrigin] = useState<Coordinates | null>(null)
  const [settledAt, setSettledAt] = useState<Coordinates | null>(null)
  const [isMovingPin, setIsMovingPin] = useState(false)

  const start = useCallback((place: PlaceWithStats) => {
    const initial = placeToDraft(place)
    setPlaceId(place.id)
    setDraft(initial)
    setOrigin(initial.coordinates)
    // Null rather than the starting point: nothing has come to rest yet, and
    // seeding this would be indistinguishable from a drag that ended where it
    // began — which is a thing the suggestion would then have to ignore.
    setSettledAt(null)
    setIsMovingPin(false)
  }, [])

  const patch = useCallback((values: Partial<PlaceDraft>) => {
    setDraft((current) => (current ? { ...current, ...values } : current))
  }, [])

  const settlePin = useCallback((coordinates: Coordinates) => {
    // Taken as an argument rather than read back out of the draft. Reading it
    // would mean a side effect inside a state updater, which React invokes
    // twice in development — and the caller has the point in its hand anyway:
    // it is the same drag event that just wrote it here.
    setSettledAt(coordinates)
  }, [])

  const startMovingPin = useCallback(() => setIsMovingPin(true), [])
  const stopMovingPin = useCallback(() => setIsMovingPin(false), [])

  const stop = useCallback(() => {
    setPlaceId(null)
    setDraft(null)
    setOrigin(null)
    setSettledAt(null)
    setIsMovingPin(false)
  }, [])

  const value = useMemo<PlaceEditContextValue>(
    () => ({
      placeId,
      draft,
      origin,
      settledAt,
      isMovingPin,
      start,
      patch,
      settlePin,
      startMovingPin,
      stopMovingPin,
      stop,
    }),
    [
      placeId,
      draft,
      origin,
      settledAt,
      isMovingPin,
      start,
      patch,
      settlePin,
      startMovingPin,
      stopMovingPin,
      stop,
    ],
  )

  return <PlaceEditContext value={value}>{children}</PlaceEditContext>
}
