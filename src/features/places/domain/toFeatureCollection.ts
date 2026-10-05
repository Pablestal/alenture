import type { Place } from '@/features/places/domain/Place'

/**
 * GeoJSON, hand-rolled rather than imported from `@types/geojson`.
 *
 * The domain layer takes no dependencies, not even type-only ones: `geojson`
 * reaches us today only as a transitive dependency of maplibre-gl, and the
 * domain has no business breaking if maplibre inlines its own types. These are
 * structurally what the map layer expects, so a mismatch surfaces as a compile
 * error at that boundary — which is where it belongs.
 */

/** GeoJSON is longitude-first. The one place where that order is written down. */
export type Position = [longitude: number, latitude: number]

export interface PointGeometry {
  type: 'Point'
  coordinates: Position
}

/** Feature properties must stay primitive: MapLibre flattens anything else. */
export interface PlaceFeatureProperties {
  id: string
  name: string
}

export interface PlaceFeature {
  type: 'Feature'
  /** Top-level id, so MapLibre feature-state can key off it. */
  id: string
  geometry: PointGeometry
  properties: PlaceFeatureProperties
}

export interface PlaceFeatureCollection {
  type: 'FeatureCollection'
  features: PlaceFeature[]
}

export function toFeature(place: Place): PlaceFeature {
  return {
    type: 'Feature',
    id: place.id,
    geometry: {
      type: 'Point',
      coordinates: [place.lng, place.lat],
    },
    properties: {
      id: place.id,
      name: place.name,
    },
  }
}

export function toFeatureCollection(places: readonly Place[]): PlaceFeatureCollection {
  return {
    type: 'FeatureCollection',
    features: places.map(toFeature),
  }
}
