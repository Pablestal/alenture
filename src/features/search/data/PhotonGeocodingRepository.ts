import type {
  GeocodingRepository,
  GeocodingReverseOptions,
  GeocodingSearchOptions,
} from '@/features/search/data/GeocodingRepository'
import { GeocodingError } from '@/features/search/data/GeocodingError'
import { createMinIntervalGate } from '@/features/search/data/minIntervalGate'
import { toReverseResult, toSearchResults } from '@/features/search/data/photonFeatureMapper'
import { SETTLEMENT_TAGS } from '@/features/search/data/photonSettlements'
import { RESULT_LIMIT, isSearchable, normalizeQuery } from '@/features/search/domain/searchQuery'
import type { ReverseResult } from '@/features/search/domain/ReverseResult'
import type { SearchResult } from '@/features/search/domain/SearchResult'
import { requireEnv } from '@/shared/lib/env'

/**
 * Both required, and neither defaulted, because two variables can disagree:
 * point one at a self-hosted Photon, forget the other, and half the feature
 * quietly keeps talking to the public instance. The symptom is a reverse lookup
 * that finds nothing, which is indistinguishable from the geocoder having
 * nothing to say about the pin — so the pair is made impossible to
 * half-configure rather than left to be noticed.
 *
 * A default would only save whoever sets this up from writing a URL they should
 * be writing deliberately anyway.
 *
 * Read at module scope, so a missing value stops the app at startup rather than
 * once per search or once per placement.
 */
const SEARCH_ENDPOINT = requireEnv('VITE_GEOCODING_API_URL')
const REVERSE_ENDPOINT = requireEnv('VITE_GEOCODING_REVERSE_URL')

/**
 * The public instance asks for no more than one request per second. Enforced
 * here, not in the UI. See `.env.example` for pointing this at your own.
 */
const MIN_REQUEST_INTERVAL_MS = 1000

/**
 * How far reverse looks by default. Kilometres — measured, not assumed: at a
 * rural point whose nearest village is 1.3 km away, `radius=1` returns nothing
 * and `radius=5` returns that village.
 *
 * Ten is deliberately modest. A pin dropped in open countryside twenty-five
 * kilometres from anywhere would come back with a town the user has no
 * relationship to and prefill it as the name — worse than an empty field,
 * because a wrong answer invites acceptance where a blank invites typing.
 *
 * It is not costing coverage, and that was checked rather than hoped: at the
 * same rural point, `radius=50` returned exactly what `radius=5` did. Past a
 * few kilometres there was simply nothing more to find. So widening this buys
 * worse answers, not more of them — do not raise it speculatively. The number
 * to revisit it with is real usage, and Photon's own ceiling is 5000.
 */
const DEFAULT_REVERSE_RADIUS_KM = 10

/**
 * One answer is all a prefill can use. Asking for more would only give the
 * mapper alternatives it has no basis to choose between — it takes the nearest,
 * which is the first, so anything past the second is paid for and discarded.
 * Two, not one, because the first feature may have no name.
 */
const REVERSE_LIMIT = 2

/**
 * Photon translates names into a fixed, short list of languages. Anything else
 * is rejected outright rather than ignored, so an unsupported locale would turn
 * every search into an error — 'default' means "the name as OSM holds it",
 * which is the right answer for a locale Photon cannot serve.
 */
const SUPPORTED_LANGUAGES = new Set(['de', 'en', 'fr', 'it'])

function toPhotonLang(lang: string | undefined): string {
  if (!lang) {
    return 'default'
  }
  // 'en-GB' and 'en' are the same language to Photon.
  const base = lang.split('-')[0]?.toLowerCase() ?? ''
  return SUPPORTED_LANGUAGES.has(base) ? base : 'default'
}

/**
 * One gate, both methods. Search and reverse are the same service and the same
 * budget: a per-method throttle would let a typed query and a dropped pin each
 * spend the whole allowance and together spend twice it.
 */
const waitForTurn = createMinIntervalGate(MIN_REQUEST_INTERVAL_MS)

/**
 * Waits its turn, asks, and hands back parsed JSON. Both methods need exactly
 * this, and the abort handling is the part worth not writing twice: an abort is
 * the caller's own doing, not a failure of the service, so it travels back
 * untouched instead of being reported as an error nobody is waiting for.
 */
async function requestJson(url: URL, signal: AbortSignal | undefined): Promise<unknown> {
  await waitForTurn(signal)

  let response: Response
  try {
    response = await fetch(url, { signal })
  } catch (cause) {
    if (isAbortError(cause)) {
      throw cause
    }
    throw GeocodingError.unavailable(cause)
  }

  if (!response.ok) {
    throw GeocodingError.unavailable(response.status)
  }

  try {
    return await response.json()
  } catch (cause) {
    if (isAbortError(cause)) {
      throw cause
    }
    throw GeocodingError.unknown(cause)
  }
}

export const photonGeocodingRepository: GeocodingRepository = {
  async search(query: string, options: GeocodingSearchOptions = {}): Promise<SearchResult[]> {
    const trimmed = normalizeQuery(query)
    // The floor is the repository's rule as much as the field's: a two-letter
    // query is a request we have decided not to spend on anybody's behalf.
    if (!isSearchable(trimmed)) {
      return []
    }

    const url = new URL(SEARCH_ENDPOINT)
    url.searchParams.set('q', trimmed)
    url.searchParams.set('limit', String(options.limit ?? RESULT_LIMIT))
    url.searchParams.set('lang', toPhotonLang(options.lang))
    for (const tag of SETTLEMENT_TAGS) {
      url.searchParams.append('osm_tag', tag)
    }

    return toSearchResults(await requestJson(url, options.signal))
  },

  async reverse(
    lat: number,
    lng: number,
    options: GeocodingReverseOptions = {},
  ): Promise<ReverseResult | null> {
    const url = new URL(REVERSE_ENDPOINT)
    url.searchParams.set('lat', String(lat))
    url.searchParams.set('lon', String(lng))
    url.searchParams.set('limit', String(REVERSE_LIMIT))
    url.searchParams.set('radius', String(options.radiusKm ?? DEFAULT_REVERSE_RADIUS_KM))
    url.searchParams.set('lang', toPhotonLang(options.lang))
    // The same filter search uses, for a sharper reason: the nearest thing to
    // any point is almost always a road, a building or a square, and none of
    // those is a city. The mapper checks the answers too — see
    // `isSettlementValue`, and the reason it does not check `osm_key`.
    for (const tag of SETTLEMENT_TAGS) {
      url.searchParams.append('osm_tag', tag)
    }

    return toReverseResult(await requestJson(url, options.signal))
  },
}

function isAbortError(cause: unknown): boolean {
  return cause instanceof DOMException && cause.name === 'AbortError'
}
