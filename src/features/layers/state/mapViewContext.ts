import { createContext } from 'react'

import type { PlaceFilters } from '@/features/layers/domain/placeFilters'
import type { MapStyleId } from '@/features/layers/domain/mapStyle'

/**
 * How the map is being VIEWED: which places are drawn, and on which basemap.
 *
 * Not to be confused with `LayersContext`, which holds the layers themselves.
 * This one holds which of them are TICKED. The split is the same one drawn
 * against `PlacesProvider` below, and for the same reason: a layer is a record
 * the user made and can lose, and its checkbox is a lens they are holding up to
 * it for the next thirty seconds.
 *
 * Deliberately not folded into `PlacesProvider`. The list of places and the
 * view of that list are different concerns — one is a record of where you have
 * been and survives a reload, the other is a lens you are holding up to it and
 * does not. Merged, every filter toggle would re-render everything that reads
 * the list, and the provider that owns writes to the database would also own
 * which checkboxes are ticked.
 *
 * Nothing here is persisted. Filters reset on reload on purpose: there is no
 * off-switch for them anywhere else in the app, so a session that came back
 * with half the map hidden would be indistinguishable from having lost places.
 * The map style resets with them for the same reason, and because it is one
 * press to change back.
 */
export interface MapViewContextValue {
  filters: PlaceFilters
  /** Adds the year to the hidden set, or takes it out. `null` is the undated row. */
  toggleYear(year: number | null): void
  /** As above, for an upper-cased alpha-2 code. `null` is the unresolved row. */
  toggleCountry(countryCode: string | null): void
  /**
   * As above, for a layer id. `null` is the Unassigned row.
   *
   * A hidden set, like the other two, and it matters most here: a layer the
   * user has only just created must not arrive hidden, and an allow-list would
   * have made that the default. See `PlaceFilters`.
   */
  toggleLayer(layerId: string | null): void
  mapStyleId: MapStyleId
  /** The URL for `mapStyleId`, resolved from env. */
  mapStyleUrl: string
  setMapStyleId(id: MapStyleId): void
}

/**
 * Undefined outside a provider, so `useMapView` can tell "no provider" apart
 * from "nothing filtered" — which otherwise both look like empty sets.
 */
export const MapViewContext = createContext<MapViewContextValue | undefined>(undefined)
