import type { ReverseResult } from '@/features/search/domain/ReverseResult'
import type { SearchResult } from '@/features/search/domain/SearchResult'

export interface GeocodingSearchOptions {
  /** Aborts the request when a newer query supersedes this one. */
  signal?: AbortSignal
  /** The active i18n locale. The implementation decides what it can honour. */
  lang?: string
  limit?: number
}

export interface GeocodingReverseOptions {
  /** Aborts the request when the placement it belongs to is abandoned. */
  signal?: AbortSignal
  /** The active i18n locale. The implementation decides what it can honour. */
  lang?: string
  /**
   * How far out to look, in kilometres. A pin in open countryside is not near
   * anything, and a search that only ever looks at the exact point would return
   * nothing for it.
   *
   * Bounded by judgement rather than by the service: the further this reaches,
   * the more likely the answer is a town the user has no relationship to, which
   * is worse than an empty field because a wrong name invites acceptance where
   * a blank invites typing.
   */
  radiusKm?: number
}

/**
 * Turning what someone typed into somewhere the map can fly to, and turning a
 * coordinate back into the settlement that contains it. Read-only by nature:
 * geocoding never writes, and neither method creates a place.
 *
 * Implementations throw `GeocodingError` on failure and re-throw the abort
 * reason untouched when the caller cancels, so a superseded query is never
 * mistaken for a broken service.
 *
 * The two methods share one request budget. An implementation talking to a
 * rate-limited service must throttle them together, not one each.
 */
export interface GeocodingRepository {
  /** A query that matches nothing returns an empty list. */
  search(query: string, options?: GeocodingSearchOptions): Promise<SearchResult[]>

  /**
   * The settlement at a coordinate, or null when there is none within reach —
   * mid-ocean, deep desert, or simply nothing tagged nearby. Null is an answer,
   * not a failure: callers prefill with nothing and say nothing about it.
   */
  reverse(lat: number, lng: number, options?: GeocodingReverseOptions): Promise<ReverseResult | null>
}
