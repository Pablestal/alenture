import type { PlacesRepository } from '@/features/places/data/PlacesRepository'
import { toRepositoryError } from '@/features/places/data/postgrestError'
import { RepositoryError } from '@/features/places/data/RepositoryError'
import {
  toInsert,
  toPlace,
  toPlaceWithStats,
  toUpdate,
} from '@/features/places/data/placeRowMapper'
import {
  assertValidCoordinatePatch,
  assertValidCoordinates,
} from '@/features/places/domain/coordinates'
import {
  assertValidTextLengthPatch,
  assertValidTextLengths,
} from '@/features/places/domain/textLimits'
import { supabase } from '@/shared/lib/supabase'

export const supabasePlacesRepository: PlacesRepository = {
  async list() {
    // The view already excludes deleted rows and carries the visit figures.
    const { data, error } = await supabase
      .from('places_active')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      throw toRepositoryError(error, 'Place')
    }
    // No rows is an empty list, never an error: RLS hiding everything and
    // owning nothing look identical from here, and both are legitimate.
    return (data ?? []).map(toPlaceWithStats)
  },

  async getById(id) {
    const { data, error } = await supabase
      .from('places')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .maybeSingle()

    if (error) {
      throw toRepositoryError(error, 'Place')
    }
    return data ? toPlace(data) : null
  },

  async create(place) {
    // Last line of defence. The form validates too, for the message; this
    // exists because the repository does not trust its callers.
    assertValidCoordinates(place.lat, place.lng)
    assertValidTextLengths(place.name, place.notes)

    // Client-side, so creating a place offline stays possible later.
    const id = crypto.randomUUID()

    const { data, error } = await supabase
      .from('places')
      .insert(toInsert(id, place))
      .select('*')
      .single()

    if (error) {
      throw toRepositoryError(error, 'Place')
    }
    return toPlace(data)
  },

  async update(id, patch) {
    assertValidCoordinatePatch(patch.lat, patch.lng)
    assertValidTextLengthPatch(patch.name, patch.notes)

    const { data, error } = await supabase
      .from('places')
      .update(toUpdate(patch))
      // Scoped to live rows: editing a deleted place reports 'not-found'
      // instead of quietly resurrecting it.
      .eq('id', id)
      .is('deleted_at', null)
      .select('*')
      .maybeSingle()

    if (error) {
      throw toRepositoryError(error, 'Place')
    }
    if (!data) {
      throw RepositoryError.notFound('Place')
    }
    return toPlace(data)
  },

  async remove(id) {
    // Soft delete. The row stays; every read filters it out.
    const { data, error } = await supabase
      .from('places')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .is('deleted_at', null)
      .select('id')
      .maybeSingle()

    if (error) {
      throw toRepositoryError(error, 'Place')
    }
    if (!data) {
      throw RepositoryError.notFound('Place')
    }
  },
}
