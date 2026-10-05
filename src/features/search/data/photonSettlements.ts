/**
 * What this app is willing to call a city, in OSM's vocabulary. One list, two
 * uses that must never drift apart: the request asks for these, and the mapper
 * checks that what came back is one of them.
 */
export const SETTLEMENT_VALUES = ['city', 'town', 'village', 'borough'] as const

/**
 * The same list as Photon's `osm_tag` filter. Photon ORs multiple `osm_tag`
 * parameters together, so this asks for settlements and nothing else — a street
 * named Salamanca and a bar named Salamanca are both noise between the user and
 * the city they meant.
 */
export const SETTLEMENT_TAGS = SETTLEMENT_VALUES.map((value) => `place:${value}`)

/**
 * Whether a feature's `osm_value` is a settlement.
 *
 * Deliberately checks the value, not the key. `osm_key === 'place'` is the
 * obvious defence here and it is the wrong one: OSM tags a square as
 * `place=square`, so Salamanca's Plaza Mayor comes back with `osm_key` of
 * 'place' and would pass a key check as a city name. Measured against the live
 * service, not assumed — an untagged reverse query at the Plaza Mayor returns
 * `place:city` Salamanca alongside `place:square` Plaza Mayor and a
 * `highway:pedestrian` of the same name.
 */
export function isSettlementValue(value: string | undefined): boolean {
  return typeof value === 'string' && SETTLEMENT_VALUES.some((settlement) => settlement === value)
}
