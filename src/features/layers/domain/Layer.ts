/**
 * A grouping the user made. Not a `layers` row.
 *
 * "Towns in Galicia", "Houses", "International" — the app has no opinion about
 * what any of those mean, and that is the whole design. Categories were the
 * opposite: our list, our taxonomy, describing what kind of thing a place was.
 * Milestone 6 deleted them because they were ours. This is the user's, which is
 * why the same repository can carry both facts without contradicting itself.
 *
 * The distinction that earns this a table is ASSIGNED versus DERIVED. A year and
 * a country cost nothing — they fall out of a date and a coordinate, they exist
 * whether or not anybody wants them, and nothing is lost by recomputing them on
 * every render, which is exactly what `buildYearGroups` does. A layer costs the
 * user a decision per place. Something a person spent effort on has to be
 * stored, has to survive a reload, and has to be theirs to rename and delete.
 *
 * There is deliberately no `deletedAt`: a deleted layer never becomes a `Layer`.
 * Anything holding one can assume it exists.
 *
 * No colour. That is 11c, with the redesign of how selection is marked, and a
 * field added here now would be one nothing writes and no marker reads.
 */
export interface Layer {
  id: string
  name: string
  /**
   * Where the user put it in the list. Not unique and not dense: reordering
   * swaps two values, and nothing depends on there being no gaps.
   */
  sort: number
  createdAt: Date
  updatedAt: Date
}

/**
 * What a caller supplies to create a layer. No id — the repository mints it, so
 * `crypto.randomUUID()` lives in one place. No timestamps — the database owns
 * those. No `user_id` — the column defaults to `auth.uid()`.
 *
 * `sort` is required rather than defaulted, and the caller works it out from the
 * list it is already holding. The database's own default is 0, which would file
 * every new layer at the top and silently reverse the creation order.
 */
export type NewLayer = Omit<Layer, 'id' | 'createdAt' | 'updatedAt'>

/** A partial edit. Renaming and reordering are the only two things there are. */
export type LayerPatch = Partial<NewLayer>

/**
 * Mirrors `check (char_length(trim(name)) between 1 and 100)` on the column.
 *
 * Half of what a place name is allowed, and not an oversight: a layer name is a
 * label on a 320px panel row, next to a count and a toggle. A place name is
 * read on its own line in a detail panel.
 */
export const MAX_LAYER_NAME_LENGTH = 100

/**
 * i18n keys, never text — `domain/` has no business knowing what language the
 * user reads. Literals rather than `string` so the typed resources check them:
 * a key renamed in the locale file becomes a compile error here.
 */
export type LayerNameErrorKey = 'manage.errors.nameRequired' | 'manage.errors.nameTooLong'

/** Null when the name is fine. The trimmed value is what gets measured, because
 * the trimmed value is what gets stored. */
export function validateLayerName(name: string): LayerNameErrorKey | null {
  const trimmed = name.trim()
  if (trimmed.length === 0) {
    return 'manage.errors.nameRequired'
  }
  if (trimmed.length > MAX_LAYER_NAME_LENGTH) {
    return 'manage.errors.nameTooLong'
  }
  return null
}

export class InvalidLayerNameError extends Error {
  constructor() {
    super(`Layer name must be between 1 and ${MAX_LAYER_NAME_LENGTH} characters`)
    this.name = 'InvalidLayerNameError'
  }
}

/**
 * Throws rather than returning a flag, so an invalid name cannot be written by
 * accident. The form validates too, for the message; this exists because the
 * repository does not trust its callers.
 */
export function assertValidLayerName(name: string): void {
  if (validateLayerName(name) !== null) {
    throw new InvalidLayerNameError()
  }
}

/**
 * The `sort` a new layer should get: after everything that exists.
 *
 * Taken from the loaded list rather than from `max(sort)` in the database.
 * There is one client per user in practice, the list is already in memory, and
 * a round trip to place a row at the end is a request to answer a question the
 * caller can already answer.
 */
export function nextSort(layers: readonly Layer[]): number {
  return layers.reduce((highest, layer) => Math.max(highest, layer.sort), -1) + 1
}
