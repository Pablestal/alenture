import type { Layer, LayerPatch, NewLayer } from '@/features/layers/domain/Layer'
import type { Database } from '@/types/database'

/**
 * The boundary. Generated types appear here and in no file above this one; the
 * rest of the app sees only domain objects.
 */
type LayerRow = Database['public']['Tables']['layers']['Row']
type LayerInsert = Database['public']['Tables']['layers']['Insert']
type LayerUpdate = Database['public']['Tables']['layers']['Update']

/**
 * `deleted_at` is not mapped: a deleted layer never becomes a `Layer`, so there
 * is nothing for the field to say. `user_id` is not mapped either — every row
 * the client can see is the client's own, by RLS.
 */
export function toLayer(row: LayerRow): Layer {
  return {
    id: row.id,
    name: row.name,
    sort: row.sort,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  }
}

/**
 * `user_id` is absent by design: the column defaults to auth.uid().
 *
 * The name is trimmed here as well as validated, matching `toNewPlace`: the
 * check constraint measures `trim(name)`, so an untrimmed name would be stored
 * with padding the database was willing to accept and the panel would then
 * render a row that looks indented for no reason.
 */
export function toInsert(id: string, layer: NewLayer): LayerInsert {
  return {
    id,
    name: layer.name.trim(),
    sort: layer.sort,
  }
}

/**
 * Only the keys the caller actually set. Spreading the whole patch would send
 * `undefined` for untouched fields, which PostgREST writes as null — and `sort`
 * is NOT NULL, so a rename would fail on a column it never meant to touch.
 */
export function toUpdate(patch: LayerPatch): LayerUpdate {
  const update: LayerUpdate = {}
  if (patch.name !== undefined) update.name = patch.name.trim()
  if (patch.sort !== undefined) update.sort = patch.sort
  return update
}
