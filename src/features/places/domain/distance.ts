import type { Coordinates } from '@/features/places/domain/coordinates'

const EARTH_RADIUS_M = 6_371_008.8

/**
 * How far the pin must travel before it is worth asking the geocoder whether
 * this is somewhere else now.
 *
 * 5km is roughly where you have left a small or medium town. It is deliberately
 * low, because it is NOT what decides whether the user is asked anything: the
 * name the geocoder returns is compared against the name in the field, and a
 * matching name shows nothing. Inside a large city you can drag 10km and get
 * "Madrid" back, and the panel stays quiet.
 *
 * So the cost of this number being too low is one wasted request, and the cost
 * of it being too high is a real move that goes unnoticed. Low is the safer
 * mistake, which is why this is not cleverer than it is.
 */
export const RENAME_SUGGESTION_DISTANCE_M = 5_000

/**
 * Great-circle distance in metres.
 *
 * Haversine on a spherical earth: wrong by up to about 0.5% against the real
 * ellipsoid, which at the 5km scale this is used for is metres. Nothing here
 * needs better, and nothing here should grow to need better — this answers
 * "roughly how far has the pin moved", never "how far apart are two cities" as
 * a figure anyone reads.
 */
export function distanceInMeters(a: Coordinates, b: Coordinates): number {
  const lat1 = toRadians(a.lat)
  const lat2 = toRadians(b.lat)
  const deltaLat = toRadians(b.lat - a.lat)
  const deltaLng = toRadians(b.lng - a.lng)

  const h =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2

  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)))
}

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180
}
