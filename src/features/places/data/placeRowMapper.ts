import { parseNullableDateOnly } from '@/features/places/domain/dateOnly'
import type { NewPlace, Place, PlacePatch, PlaceWithStats } from '@/features/places/domain/Place'
import { RepositoryError } from '@/features/places/data/RepositoryError'
import type { Database } from '@/types/database'

/**
 * The boundary. Generated types appear here and in no file above this one; the
 * rest of the app sees only domain objects.
 */
type PlaceRow = Database['public']['Tables']['places']['Row']
type PlaceInsert = Database['public']['Tables']['places']['Insert']
type PlaceUpdate = Database['public']['Tables']['places']['Update']
type PlacesActiveRow = Database['public']['Views']['places_active']['Row']

export function toPlace(row: PlaceRow): Place {
  return {
    id: row.id,
    name: row.name,
    lat: row.lat,
    lng: row.lng,
    layerId: row.layer_id,
    countryCode: row.country_code,
    address: row.address,
    notes: row.notes,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  }
}

/**
 * Postgres cannot infer NOT NULL through a view, so every column of
 * `places_active` is generated as nullable even though the columns it selects
 * are NOT NULL on `places` — and `count()` never returns null either. These are
 * the ones the schema does guarantee.
 *
 * `layer_id`, `country_code`, `address`, `notes`, `first_visit` and
 * `last_visit` are absent on purpose: those are genuinely nullable.
 */
/*
 * This array is better protected than it looks, and protected by something
 * other than itself.
 *
 * Naming a column the view no longer has fails to compile, at the mapped type
 * below. Omitting one that is NOT NULL also fails — not here, but where the
 * domain type receives it: `PlaceWithStats.name` is `string`, so a `string |
 * null` cannot reach it. The strictness of the domain types is what turns a
 * dropped column into a compile error; the array on its own would not.
 *
 * What no compiler can see is the database's own nullability, which the view
 * types erase — every column arrives nullable whatever the base table says. Two
 * ways that bites: a column that stops being NOT NULL in a later migration, so
 * this keeps asserting and starts throwing on rows that are legitimately null;
 * and a NOT NULL column left off this list, which silently forfeits a guarantee
 * the mapper could have had. Only the first hurts.
 *
 * The answer, once there is a third view rather than two, is a single
 * `information_schema` assertion in CI comparing this list to the view's real
 * nullability — not type machinery. Only the database knows the answer, so only
 * asking it settles anything.
 */
const REQUIRED_COLUMNS = [
  'id',
  'name',
  'lat',
  'lng',
  'created_at',
  'updated_at',
  'visit_count',
] as const

type RequiredColumn = (typeof REQUIRED_COLUMNS)[number]

type CheckedPlacesActiveRow = Omit<PlacesActiveRow, RequiredColumn> & {
  [K in RequiredColumn]: NonNullable<PlacesActiveRow[K]>
}

/**
 * Restores the shape the table already guarantees, so nothing above `data/` has
 * to reason about a view's nullability. A null here is not a data variation the
 * UI should absorb — it means the view no longer selects what this mapper
 * expects — so it fails rather than inventing a place.
 */
function checkRow(row: PlacesActiveRow): CheckedPlacesActiveRow {
  for (const column of REQUIRED_COLUMNS) {
    if (row[column] === null) {
      throw RepositoryError.unknown(
        new Error(`places_active returned a null "${column}", which the schema forbids`),
      )
    }
  }
  // The loop is the proof; TypeScript cannot narrow a whole row through it.
  return row as CheckedPlacesActiveRow
}

export function toPlaceWithStats(viewRow: PlacesActiveRow): PlaceWithStats {
  const row = checkRow(viewRow)

  return {
    id: row.id,
    name: row.name,
    lat: row.lat,
    lng: row.lng,
    layerId: row.layer_id,
    countryCode: row.country_code,
    address: row.address,
    notes: row.notes,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    // count() returns bigint, which PostgREST may serialise as a string.
    visitCount: Number(row.visit_count),
    firstVisit: parseNullableDateOnly(row.first_visit),
    lastVisit: parseNullableDateOnly(row.last_visit),
  }
}

/**
 * `user_id` is absent by design: the column defaults to auth.uid().
 *
 * `source` is written and never read: `toPlace` does not map it back, because
 * `Place` describes a city and provenance is not part of that. See `NewPlace`.
 *
 * `geom` is absent because it cannot be written. It is a generated column, and
 * Postgres rejects any insert or update that names it. The CLI does not model
 * generated columns, so it appears as an optional `unknown` on `PlaceInsert` and
 * `PlaceUpdate` — the types permit a write the database will refuse. Nothing
 * here should ever set it; `lat`/`lng` are the input, and `geom` is derived from
 * them.
 */
export function toInsert(id: string, place: NewPlace): PlaceInsert {
  return {
    id,
    name: place.name,
    lat: place.lat,
    lng: place.lng,
    layer_id: place.layerId,
    country_code: place.countryCode,
    address: place.address,
    notes: place.notes,
    source: place.source,
  }
}

/**
 * Only the keys the caller actually set. Spreading the whole patch would send
 * `undefined` for untouched fields, which PostgREST writes as null.
 *
 * `geom` is never among them, for the reason given on `toInsert`.
 */
export function toUpdate(patch: PlacePatch): PlaceUpdate {
  const update: PlaceUpdate = {}
  if (patch.name !== undefined) update.name = patch.name
  if (patch.lat !== undefined) update.lat = patch.lat
  if (patch.lng !== undefined) update.lng = patch.lng
  // Null is a legitimate value: it unfiles the place. `!== undefined` is what
  // tells "set it to nothing" apart from "do not touch it".
  if (patch.layerId !== undefined) update.layer_id = patch.layerId
  if (patch.countryCode !== undefined) update.country_code = patch.countryCode
  if (patch.address !== undefined) update.address = patch.address
  if (patch.notes !== undefined) update.notes = patch.notes
  // An edit that overwrites a geocoded name is what turns 'search' into
  // 'manual', so this is a legitimate thing to patch even though nothing reads
  // the column back. See the note on `NewPlace`.
  if (patch.source !== undefined) update.source = patch.source
  return update
}
