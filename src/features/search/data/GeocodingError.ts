/**
 * What went wrong looking a place up. Nothing above `data/` should ever inspect
 * an HTTP status.
 *
 * There is no 'not-found' kind: a query that matches nothing is an empty list,
 * not a failure. Search is allowed to fail — the map must stay usable when it
 * does — so the UI only ever needs to tell "no results" from "we could not ask".
 */
export type GeocodingErrorKind = 'unavailable' | 'unknown'

export class GeocodingError extends Error {
  readonly kind: GeocodingErrorKind

  constructor(kind: GeocodingErrorKind, message: string, options?: { cause?: unknown }) {
    super(message, options)
    this.name = 'GeocodingError'
    this.kind = kind
  }

  /** The service answered, and the answer was not usable. */
  static unavailable(cause?: unknown): GeocodingError {
    return new GeocodingError('unavailable', 'The geocoder is unavailable', { cause })
  }

  static unknown(cause: unknown): GeocodingError {
    return new GeocodingError('unknown', 'The search request failed', { cause })
  }
}
