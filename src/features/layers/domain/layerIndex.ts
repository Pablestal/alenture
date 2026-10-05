import type { Layer } from '@/features/layers/domain/Layer'
import type { PlaceWithStats } from '@/features/places/domain/Place'

/**
 * One layer and the places filed under it, ready to be a section of the panel.
 *
 * `layer` is null for the Unassigned group, which is a group and not a leftover:
 * a place with no layer is still a place, and dropping it here would make the
 * layer counts add up to less than the total with nothing on screen to explain
 * the difference. Same reasoning as the undated row in `buildYearGroups`.
 */
export interface LayerIndexGroup {
  /** Null is the Unassigned group. */
  layer: Layer | null
  places: PlaceWithStats[]
}

/**
 * The panel's index: every layer in the user's order, then Unassigned.
 *
 * The count is of what EXISTS, never of what is showing — nothing here takes a
 * `PlaceFilters`, for the same reason `buildYearGroups` does not. A count that
 * fell as you unticked rows would be answering a question nobody asked; you can
 * already see what is on the map.
 *
 * ## An empty layer keeps its row
 *
 * Unlike the year and country groups, which only exist because a place put them
 * there, a layer exists because the user made it. A layer with nothing in it yet
 * is the normal state of a layer thirty seconds old, and hiding it would mean
 * creating one appeared to do nothing at all.
 *
 * ## An unknown `layerId` reads as unassigned
 *
 * A place can point at a layer this list does not contain: deleted in another
 * tab, or deleted in this one in the window between the layer leaving the list
 * and the places being told. Rather than dropping the place or inventing a
 * group for a layer nobody can name, it falls into Unassigned — which is what
 * the database will say about it as soon as anyone asks.
 *
 * Places are sorted by name with the active locale's collator. An index is
 * alphabetical; the list's own newest-first order is for a map, not for looking
 * something up.
 */
export function buildLayerIndex(
  places: readonly PlaceWithStats[],
  layers: readonly Layer[],
  locale: string,
): LayerIndexGroup[] {
  const byLayer = new Map<string, PlaceWithStats[]>()
  for (const layer of layers) {
    byLayer.set(layer.id, [])
  }

  const unassigned: PlaceWithStats[] = []
  for (const place of places) {
    const group = place.layerId === null ? undefined : byLayer.get(place.layerId)
    if (group) {
      group.push(place)
    } else {
      unassigned.push(place)
    }
  }

  const collator = new Intl.Collator(locale)
  const byName = (a: PlaceWithStats, b: PlaceWithStats) => collator.compare(a.name, b.name)

  const groups: LayerIndexGroup[] = layers.map((layer) => ({
    layer,
    places: (byLayer.get(layer.id) ?? []).sort(byName),
  }))

  // Last, always. It is where things end up rather than somewhere they were
  // put, so it sorts below every layer the user actually made — and it is the
  // one row that disappears entirely when there is nothing in it, because
  // "Unassigned: 0" is a fact about nothing.
  if (unassigned.length > 0) {
    groups.push({ layer: null, places: unassigned.sort(byName) })
  }
  return groups
}

/**
 * The user's order: `sort`, then `createdAt` for ties.
 *
 * Ties are not hypothetical. Reordering swaps two `sort` values as two separate
 * writes, so a failure between them leaves two layers sharing a number — and
 * without a tiebreak the list would then reorder itself on every render for
 * reasons the user could not possibly infer. Wrong-but-stable is recoverable by
 * pressing the arrow again; unstable is not.
 */
export function sortLayers(layers: readonly Layer[]): Layer[] {
  return [...layers].sort(
    (a, b) => a.sort - b.sort || a.createdAt.getTime() - b.createdAt.getTime(),
  )
}
