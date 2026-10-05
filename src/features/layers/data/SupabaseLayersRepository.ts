import type { LayersRepository } from '@/features/layers/data/LayersRepository'
import { toInsert, toLayer, toUpdate } from '@/features/layers/data/layerRowMapper'
import { assertValidLayerName } from '@/features/layers/domain/Layer'
import { toRepositoryError } from '@/features/places/data/postgrestError'
import { RepositoryError } from '@/features/places/data/RepositoryError'
import { supabase } from '@/shared/lib/supabase'

export const supabaseLayersRepository: LayersRepository = {
  async list() {
    // No `layers_active` view. The two that exist earn their keep by joining
    // and aggregating; this would be `select * where deleted_at is null` under
    // another name, and a view whose only content is the filter every read
    // applies anyway is a second place for that filter to be forgotten.
    const { data, error } = await supabase
      .from('layers')
      .select('*')
      .is('deleted_at', null)
      // The user's own order. `created_at` breaks ties, matching `sortLayers`
      // — two layers can share a `sort` after a half-completed reorder, and the
      // list must not shuffle between a refetch and a re-render.
      .order('sort', { ascending: true })
      .order('created_at', { ascending: true })

    if (error) {
      throw toRepositoryError(error, 'Layer')
    }
    // No rows is an empty list, never an error: RLS hiding everything and
    // owning nothing look identical from here, and both are legitimate.
    return (data ?? []).map(toLayer)
  },

  async create(layer) {
    // Last line of defence. The panel validates too, for the message; this
    // exists because the repository does not trust its callers.
    assertValidLayerName(layer.name)

    // Client-side, so creating a layer offline stays possible later.
    const id = crypto.randomUUID()

    const { data, error } = await supabase
      .from('layers')
      .insert(toInsert(id, layer))
      .select('*')
      .single()

    if (error) {
      throw toRepositoryError(error, 'Layer')
    }
    return toLayer(data)
  },

  async update(id, patch) {
    if (patch.name !== undefined) {
      assertValidLayerName(patch.name)
    }

    const { data, error } = await supabase
      .from('layers')
      .update(toUpdate(patch))
      // Scoped to live rows: editing a deleted layer reports 'not-found'
      // instead of quietly resurrecting it.
      .eq('id', id)
      .is('deleted_at', null)
      .select('*')
      .maybeSingle()

    if (error) {
      throw toRepositoryError(error, 'Layer')
    }
    if (!data) {
      throw RepositoryError.notFound('Layer')
    }
    return toLayer(data)
  },

  async remove(id) {
    /*
     * The one delete in this app that is not an `update ... set deleted_at`,
     * and the reason is in the function's own comment in the migration — read
     * that, not this. In short: soft-deleting the layer and unassigning its
     * places are two writes, PostgREST cannot wrap two writes in a transaction,
     * and the half-completed version of this operation throws away the user's
     * assignments while reporting that nothing happened.
     *
     * `security invoker`, so RLS still decides what it can touch. This grants
     * nothing that a pair of ordinary updates would not have granted.
     */
    const { data, error } = await supabase.rpc('delete_layer', { p_layer_id: id })

    if (error) {
      throw toRepositoryError(error, 'Layer')
    }
    // False means there was no live layer to delete — already gone, or never
    // ours. The function returns rather than raising so that this stays an
    // ordinary 'not-found' and not an unknown Postgres failure.
    if (!data) {
      throw RepositoryError.notFound('Layer')
    }
  },
}
