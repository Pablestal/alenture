/**
 * What the geocoder says is at a coordinate. The answer to "which city is this
 * point in", asked once a pin has been put down.
 *
 * Not a `SearchResult`: that is somewhere to fly to, chosen from a list. This
 * is a single guess about somewhere the user is already standing, and it exists
 * to prefill a form the user then has the last word on.
 *
 * There is no `bbox` and no `id`. Nothing flies to this, and nothing keys a
 * list on it — see the note on `source_ref` in `placeDraft`, which is why the
 * OSM identity is deliberately not carried here either.
 */
export interface ReverseResult {
  /** The settlement. "Salamanca". */
  name: string
  /** ISO 3166-1 alpha-2, upper case, or null when the geocoder did not say. */
  countryCode: string | null
  /**
   * OSM's own word for what this is — 'city', 'town', 'village', 'borough'.
   * Kept raw and untranslated: it is the geocoder's classification, not ours,
   * and nothing displays it today. It is what will size a marker once there is
   * a rule for that, which is why it survives the mapping at all.
   */
  settlementType: string | null
}
