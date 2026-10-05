/**
 * Below this, a query matches most of the map and costs a request to say so.
 * The rule lives here rather than in the field because the repository applies
 * it too — being a good citizen towards a free service is not something a
 * caller gets to opt out of.
 */
export const MIN_QUERY_LENGTH = 3

/** How many results the panel shows. Enough to choose from, not to scroll. */
export const RESULT_LIMIT = 6

export function normalizeQuery(query: string): string {
  return query.trim()
}

export function isSearchable(query: string): boolean {
  return normalizeQuery(query).length >= MIN_QUERY_LENGTH
}
