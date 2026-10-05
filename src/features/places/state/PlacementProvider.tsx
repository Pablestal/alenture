import type { ReactNode } from 'react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { Coordinates } from '@/features/places/domain/coordinates'
import type {
  PlacementContextValue,
  PlacementDetection,
  PlacementMode,
} from '@/features/places/state/placementContext'
import { PlacementContext } from '@/features/places/state/placementContext'
import type { GeocodingRepository } from '@/features/search/data/GeocodingRepository'

const IDLE_DETECTION: PlacementDetection = { status: 'idle', result: null }

interface PlacementProviderProps {
  children: ReactNode
  /**
   * Required, and never defaulted to Photon, for the same reason
   * `SearchProvider` takes one: this module must stay ignorant of which
   * geocoder it is talking to. `AppProviders` owns the choice.
   */
  geocodingRepository: GeocodingRepository
}

/**
 * Owns where the pin being placed is, and nothing about how it got there. The
 * two surfaces disagree completely on that — a click versus a map centre — and
 * both end up calling the same `setDraft`.
 *
 * Knows nothing about MapLibre on purpose: seeding the first point needs the
 * live map centre, which only a component inside the map can read.
 *
 * It does know about the geocoder, because asking what is at the point is
 * triggered by a placement transition and nothing else — the form is a
 * consumer of the answer, not the reason it was asked for.
 */
export function PlacementProvider({ children, geocodingRepository }: PlacementProviderProps) {
  const { i18n } = useTranslation()
  const [mode, setMode] = useState<PlacementMode>('idle')
  const [draft, setDraftState] = useState<Coordinates | null>(null)
  const [detection, setDetection] = useState<PlacementDetection>(IDLE_DETECTION)
  /**
   * The point as it was when the user confirmed, which is not the same as the
   * live draft: the pin stays draggable while the form is open. This is what
   * the effect below keys on, and it is the whole of "one request per confirmed
   * location, nothing on drag".
   */
  const [confirmedPoint, setConfirmedPoint] = useState<Coordinates | null>(null)
  const language = i18n.language

  const start = useCallback(() => {
    // Cleared rather than kept: a stale point from a cancelled attempt would
    // put a pin somewhere the user is no longer looking.
    setDraftState(null)
    setDetection(IDLE_DETECTION)
    setConfirmedPoint(null)
    setMode('placing')
  }, [])

  const setDraft = useCallback((coordinates: Coordinates) => {
    setDraftState(coordinates)
  }, [])

  const cancel = useCallback(() => {
    setMode('idle')
    setDraftState(null)
    setDetection(IDLE_DETECTION)
    setConfirmedPoint(null)
  }, [])

  const confirm = useCallback(() => {
    // Nothing to confirm before a point exists. Guarded here rather than only in
    // the button, so a keyboard path added later cannot skip the check.
    if (!draft) {
      return
    }
    // The draft survives: the form opens on this point and the pin stays
    // draggable, so the coordinates keep moving under it.
    setConfirmedPoint(draft)
    // Said here and not left to the effect below, which runs only after the
    // form has rendered: otherwise the field would open bare for one frame and
    // then grow a loading hint, which reads as a glitch rather than as work
    // starting.
    setDetection({ status: 'detecting', result: null })
    setMode('editing')
  }, [draft])

  useEffect(() => {
    if (!confirmedPoint) {
      return
    }

    const controller = new AbortController()
    // Said before the request goes out, so the form can open on a loading hint
    // rather than on an empty field that fills in from nowhere.
    setDetection({ status: 'detecting', result: null })

    void geocodingRepository
      .reverse(confirmedPoint.lat, confirmedPoint.lng, {
        signal: controller.signal,
        lang: language,
      })
      .then((result) => {
        if (controller.signal.aborted) {
          return
        }
        setDetection({ status: 'done', result })
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
          return
        }
        // Silent to the user, and deliberately indistinguishable there from
        // "nothing there": this is a convenience, not a step, and a name that
        // failed to arrive leaves an empty field — exactly what the user would
        // have faced without the feature at all.
        //
        // Not silent to whoever is looking at the console. The two cases are
        // the same empty field and nothing else tells them apart, so a broken
        // integration reads as open sea until someone spends an afternoon on
        // it. The user-facing silence is the spec; this is the cost of it, paid
        // where it does no harm.
        console.warn('Reverse geocoding failed; the name field was left empty', error)
        setDetection({ status: 'done', result: null })
      })

    return () => controller.abort()
  }, [confirmedPoint, language, geocodingRepository])

  useEffect(() => {
    // 'placing' only. There is nothing to lose at this point — no typing has
    // happened — so Escape simply leaves.
    //
    // Escape during 'editing' is handled by the form instead, because only the
    // form knows whether anything has been typed, and that is what decides
    // between leaving at once and asking first.
    if (mode !== 'placing') {
      return
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        cancel()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [mode, cancel])

  const value = useMemo<PlacementContextValue>(
    () => ({ mode, draft, detection, start, setDraft, cancel, confirm }),
    [mode, draft, detection, start, setDraft, cancel, confirm],
  )

  return <PlacementContext value={value}>{children}</PlacementContext>
}
