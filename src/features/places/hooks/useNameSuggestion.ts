import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { Coordinates } from '@/features/places/domain/coordinates'
import {
  RENAME_SUGGESTION_DISTANCE_M,
  distanceInMeters,
} from '@/features/places/domain/distance'
import { useGeocodingRepository } from '@/features/search/state/useGeocodingRepository'

interface UseNameSuggestionOptions {
  /** Where the pin was when the edit began, or null when nothing is being edited. */
  origin: Coordinates | null
  /** Where the pin last came to rest. Null until it has been dragged and released. */
  settledAt: Coordinates | null
  /** The name in the field right now, which is what a suggestion is compared against. */
  currentName: string
}

/**
 * Offers a new name when the pin has been dragged somewhere that is plainly a
 * different city, and never applies one.
 *
 * Moving a pin does NOT re-run the prefill. The name is something the user
 * already accepted or wrote, and replacing it because they nudged the pin fifty
 * metres would overwrite their answer with the geocoder's. But dragging a pin
 * three hundred kilometres is a real thing to do, and leaving "Salamanca" on a
 * point in Portugal is its own kind of wrong. So it is offered.
 *
 * ## Once per 5km of further travel
 *
 * This was "once per edit session" first, and that was too stingy in practice:
 * moving the pin a second time before saving left the panel silent, because the
 * one lookup the session was allowed had already been spent on the first move.
 *
 * So the threshold re-arms. Each lookup records the point it asked about, and
 * the next one fires when the pin settles `RENAME_SUGGESTION_DISTANCE_M` from
 * THAT — not from where the edit began. Measuring from the last asked point
 * rather than from the origin is what makes a second, third and fourth move
 * each get their own answer, while a pin nudged around inside one city still
 * costs one request.
 *
 * It also fixes something "once" got wrong beyond being stingy: a standing
 * offer outlived the pin it was about. Ask about a point, drag 300km further,
 * and the panel went on offering the city from the first lookup — a suggestion
 * that was not merely stale but wrong about where the pin now was. An offer is
 * withdrawn the moment a new one is asked for.
 */
export function useNameSuggestion({
  origin,
  settledAt,
  currentName,
}: UseNameSuggestionOptions) {
  const { i18n } = useTranslation()
  const geocoding = useGeocodingRepository()
  const [suggestion, setSuggestion] = useState<string | null>(null)
  /**
   * The point the last lookup was about, or null when none has been made this
   * session. The next lookup is measured from here rather than from `origin`,
   * which is what lets a second move be answered.
   */
  const lastAskedFrom = useRef<Coordinates | null>(null)
  /**
   * The name as it stands, for the moment the answer arrives. A ref rather than
   * a dependency: the comparison has to use the latest name, but typing must
   * not re-run a lookup that is keyed on the pin having moved.
   */
  const nameRef = useRef(currentName)
  nameRef.current = currentName

  // A new edit session — or the end of one. Either way the last lookup and any
  // standing offer belong to the session that is over.
  useEffect(() => {
    lastAskedFrom.current = null
    setSuggestion(null)
  }, [origin])

  const language = i18n.language

  useEffect(() => {
    if (!origin || !settledAt) {
      return
    }
    /*
     * Measured from the last point asked about, falling back to where the edit
     * began. Short of the threshold there is nothing to do — and any offer
     * already on screen stays, because the pin is still near the point that
     * offer was about.
     */
    const reference = lastAskedFrom.current ?? origin
    if (distanceInMeters(reference, settledAt) < RENAME_SUGGESTION_DISTANCE_M) {
      return
    }
    lastAskedFrom.current = settledAt
    // The pin has moved somewhere new enough to ask about, so whatever was
    // being offered was about somewhere else. Withdrawn before the question is
    // asked, not after it is answered: the wrong name must not be sitting there
    // offering itself while the request is in flight.
    setSuggestion(null)

    const controller = new AbortController()
    void geocoding
      .reverse(settledAt.lat, settledAt.lng, { signal: controller.signal, lang: language })
      .then((result) => {
        if (controller.signal.aborted || !result) {
          return
        }
        // Nothing to offer when the geocoder agrees with the field. Compared
        // loosely — case and surrounding space are not a different city, and
        // offering "Porto" to replace "porto " is noise pretending to be help.
        if (isSameName(result.name, nameRef.current)) {
          return
        }
        setSuggestion(result.name)
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
          return
        }
        // Silent to the user, exactly as the placement prefill is: this is a
        // convenience nobody asked for, and a failed one leaves the name they
        // already had. Logged, because otherwise a broken integration is
        // indistinguishable from a geocoder that had nothing to say.
        console.warn('Reverse geocoding failed; no name was suggested', error)
      })

    return () => controller.abort()
  }, [origin, settledAt, geocoding, language])

  const dismiss = useCallback(() => setSuggestion(null), [])

  return { suggestion, dismiss }
}

function isSameName(a: string, b: string): boolean {
  return a.trim().toLocaleLowerCase() === b.trim().toLocaleLowerCase()
}
