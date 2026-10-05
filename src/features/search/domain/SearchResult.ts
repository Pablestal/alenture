/**
 * A settlement the geocoder found. It is a destination for the map and nothing
 * more: search never creates a place, so this is not a `Place` in waiting and
 * deliberately carries none of a place's fields.
 */
export interface SearchResult {
  /**
   * Stable within one response, used as a React key and for keyboard focus.
   * Built by the mapper from the OSM identity — the geocoder has no id of its
   * own — so it must never be persisted or compared across responses.
   */
  id: string
  /** The settlement. "Salamanca", not "Salamanca, Castile and León, Spain". */
  name: string
  /** Region and country as one line, ready to render. Empty when unknown. */
  displayContext: string
  lat: number
  lng: number
  /** The settlement's extent, when the geocoder knows it. */
  bbox: BoundingBox | null
}

/**
 * Edges in degrees, in the order MapLibre's `fitBounds` wants them read.
 * Not the order the geocoder sends — see `photonFeatureMapper`.
 */
export interface BoundingBox {
  west: number
  south: number
  east: number
  north: number
}
