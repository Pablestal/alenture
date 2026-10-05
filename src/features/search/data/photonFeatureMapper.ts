import { isSettlementValue } from '@/features/search/data/photonSettlements'
import type { ReverseResult } from '@/features/search/domain/ReverseResult'
import type { BoundingBox, SearchResult } from '@/features/search/domain/SearchResult'

/**
 * Photon's GeoJSON, as much of it as we read. Everything is optional because
 * the geocoder fills what it knows and omits the rest — a village may have no
 * `state`, and a whole country may have no `extent`.
 *
 * These types never leave `data/`. A `SearchResult` is not a Photon feature.
 */
interface PhotonProperties {
  osm_id?: number
  osm_type?: string
  /** The OSM key, always 'place' for us — the tag filter sees to that. */
  osm_key?: string
  /** The OSM value: 'city', 'town', 'village', 'borough'. */
  osm_value?: string
  name?: string
  state?: string
  county?: string
  country?: string
  countrycode?: string
  extent?: number[]
}

interface PhotonFeature {
  geometry?: { coordinates?: number[] }
  properties?: PhotonProperties
}

interface PhotonResponse {
  features?: PhotonFeature[]
}

/**
 * Photon's `extent` is `[minLon, maxLat, maxLon, minLat]` — west, NORTH, east,
 * SOUTH. That is not the usual `[west, south, east, north]` of a GeoJSON bbox,
 * and the two differ only by which of positions 1 and 3 is which, so a wrong
 * reading produces a valid-looking rectangle framed on the wrong ground.
 *
 * The order below is deliberate and matches Photon's documented output. Do not
 * "fix" it to the GeoJSON order without changing the geocoder too.
 */
function toBoundingBox(extent: number[] | undefined): BoundingBox | null {
  if (!Array.isArray(extent) || extent.length !== 4) {
    return null
  }
  const [west, north, east, south] = extent
  if (
    west === undefined ||
    north === undefined ||
    east === undefined ||
    south === undefined ||
    !Number.isFinite(west) ||
    !Number.isFinite(north) ||
    !Number.isFinite(east) ||
    !Number.isFinite(south)
  ) {
    return null
  }
  return { west, south, east, north }
}

/**
 * Region and country on one line. `state` first, `county` only when there is no
 * state: some countries have one and not the other, and printing both turns a
 * short line into an address.
 */
function toDisplayContext(properties: PhotonProperties): string {
  const region = properties.state ?? properties.county
  return [region, properties.country].filter((part) => Boolean(part)).join(', ')
}

/**
 * Null when the feature cannot be flown to or named — a result with no
 * coordinate is not a destination, and one with no name cannot be picked from a
 * list. Both are dropped rather than rendered as a blank row.
 */
export function toSearchResult(feature: PhotonFeature, index: number): SearchResult | null {
  const properties = feature?.properties ?? {}
  const name = properties.name
  const coordinates = feature?.geometry?.coordinates
  // GeoJSON order here, unlike `extent`: longitude first.
  const lng = Array.isArray(coordinates) ? coordinates[0] : undefined
  const lat = Array.isArray(coordinates) ? coordinates[1] : undefined

  if (typeof name !== 'string' || name === '') {
    return null
  }
  if (typeof lng !== 'number' || typeof lat !== 'number') {
    return null
  }
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
    return null
  }

  return {
    // The OSM identity when there is one, and the position in the response when
    // there is not. Unique within this response, which is all a key needs.
    id:
      properties.osm_type !== undefined && properties.osm_id !== undefined
        ? `${properties.osm_type}${properties.osm_id}`
        : `index-${index}`,
    name,
    displayContext: toDisplayContext(properties),
    lat,
    lng,
    bbox: toBoundingBox(properties.extent),
  }
}

/**
 * Takes `unknown` rather than a parsed shape: this is JSON off the wire, and
 * the types above are what we hope for, not what we were promised. Every field
 * the mapper reads is checked, so a malformed payload yields fewer results
 * instead of a crash.
 */
export function toSearchResults(payload: unknown): SearchResult[] {
  const response = (payload ?? {}) as PhotonResponse
  const features = Array.isArray(response.features) ? response.features : []
  const results: SearchResult[] = []
  for (const [index, feature] of features.entries()) {
    const result = toSearchResult(feature, index)
    if (result) {
      results.push(result)
    }
  }
  return results
}

/**
 * ISO 3166-1 alpha-2, or null. Photon sends 'ES' already upper case, but the
 * column is what the rest of the app compares against and a lower-case 'es'
 * would sort and group as a different country — so the shape is enforced here
 * rather than trusted. Anything that is not two letters is dropped: a country
 * code we cannot rely on is worse than none, because statistics would count it.
 */
function toCountryCode(value: string | undefined): string | null {
  if (typeof value !== 'string') {
    return null
  }
  const code = value.trim().toUpperCase()
  return /^[A-Z]{2}$/.test(code) ? code : null
}

/**
 * The nearest settlement Photon knows, or null.
 *
 * Reverse returns a FeatureCollection ordered by distance, so the first feature
 * that maps is the answer — later ones are further away and were only ever
 * alternatives. A feature that is unnamed, or not a settlement, is skipped
 * rather than ending the search: neither is a name we can prefill, but the next
 * one may be, and returning null there would discard a usable answer.
 *
 * Takes `unknown` for the same reason `toSearchResults` does: this is JSON off
 * the wire, and `PhotonResponse` is what we hope for, not what we were promised.
 */
export function toReverseResult(payload: unknown): ReverseResult | null {
  const response = (payload ?? {}) as PhotonResponse
  const features = Array.isArray(response.features) ? response.features : []

  for (const feature of features) {
    const properties = feature?.properties ?? {}
    const name = properties.name
    if (typeof name !== 'string' || name === '') {
      continue
    }
    // Second line of defence, not the first: the request already asks for
    // settlements and the service honours it. This is what holds if that ever
    // stops being true — see `isSettlementValue` for why the check is on the
    // value and not on `osm_key`, which looks right and is not.
    //
    // Skipped rather than fatal, for the same reason an unnamed feature is: the
    // next feature may be the city. What this must never do is hand back a
    // square or a street, because a wrong name in the field invites acceptance
    // where a blank invites typing.
    if (!isSettlementValue(properties.osm_value)) {
      continue
    }
    return {
      name,
      countryCode: toCountryCode(properties.countrycode),
      settlementType: typeof properties.osm_value === 'string' ? properties.osm_value : null,
    }
  }

  return null
}
