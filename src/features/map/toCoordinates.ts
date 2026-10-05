import type { LngLat } from 'react-map-gl/maplibre'

import type { Coordinates } from '@/features/places/domain/coordinates'

/**
 * A point the map reported, as a coordinate anything else may hold.
 *
 * Every path from a map event to a draft goes through here, for one reason:
 * `wrap()`.
 *
 * The map scrolls past the antimeridian quite happily, into the next copy of
 * the world. Drag a pin or click out there and MapLibre reports a longitude of
 * 190, or -200 — which is a real point on screen and not a longitude the
 * database accepts. Nothing looks wrong at the time: the pin is where the user
 * put it, the coordinates read plausibly, and the failure arrives at Save as
 * "That point is not on Earth", about a point that visibly is.
 *
 * Wrapped here rather than at the save, so the figures the form displays are
 * the ones that will be stored. Latitude needs no equivalent — the map cannot
 * be scrolled past a pole.
 *
 * This module exists so that sentence is written once. It was the same one-line
 * bug in three places, which is what a shared line prevents and three copies of
 * `.wrap()` would not have.
 */
export function toCoordinates(lngLat: LngLat): Coordinates {
  const wrapped = lngLat.wrap()
  return { lat: wrapped.lat, lng: wrapped.lng }
}
