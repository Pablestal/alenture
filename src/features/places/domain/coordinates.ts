/** Latitude and longitude checks. Pure, and the last word on what is on Earth. */

export function isValidLatitude(value: number): boolean {
  return Number.isFinite(value) && value >= -90 && value <= 90
}

export function isValidLongitude(value: number): boolean {
  return Number.isFinite(value) && value >= -180 && value <= 180
}

export function areValidCoordinates(lat: number, lng: number): boolean {
  return isValidLatitude(lat) && isValidLongitude(lng)
}

export class InvalidCoordinatesError extends Error {
  /** Undefined when a partial edit left that coordinate alone. */
  readonly lat: number | undefined
  readonly lng: number | undefined

  constructor(lat: number | undefined, lng: number | undefined) {
    super(`Coordinates out of range: ${lat ?? 'unchanged'}, ${lng ?? 'unchanged'}`)
    this.name = 'InvalidCoordinatesError'
    this.lat = lat
    this.lng = lng
  }
}

/** Throws rather than returning a flag, so a bad point cannot be written by accident. */
export function assertValidCoordinates(lat: number, lng: number): void {
  if (!areValidCoordinates(lat, lng)) {
    throw new InvalidCoordinatesError(lat, lng)
  }
}

/**
 * The same check for a partial edit, where either coordinate may be absent.
 * Each present value is judged on its own: an edit that moves only the latitude
 * cannot be validated as a pair, and refusing it would be wrong.
 */
export function assertValidCoordinatePatch(lat?: number, lng?: number): void {
  const latBad = lat !== undefined && !isValidLatitude(lat)
  const lngBad = lng !== undefined && !isValidLongitude(lng)
  if (latBad || lngBad) {
    throw new InvalidCoordinatesError(lat, lng)
  }
}

/** A point, as the app passes it around. Order-independent, unlike a tuple. */
export interface Coordinates {
  lat: number
  lng: number
}

/**
 * Five decimal places — roughly a metre, and the precision a person can
 * actually aim at on a map. Fixed on both ends so the figures do not change
 * width as the pin moves, which is what makes tabular-nums worth having.
 */
const COORDINATE_DECIMALS = 5

export function formatCoordinate(value: number, locale: string): string {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: COORDINATE_DECIMALS,
    maximumFractionDigits: COORDINATE_DECIMALS,
  }).format(value)
}
