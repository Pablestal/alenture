import { createContext } from 'react'

/**
 * Which place the detail panel is showing, if any.
 *
 * Deliberately not part of `PlacementMode`. A selected place and a placement in
 * progress are different things that happen to use the same corner of the
 * screen: one is a record that exists, the other is a record being made. Folded
 * into one enum they would start sharing transitions — cancelling placement
 * would have to decide what it does to a selection, and "closing the form"
 * would become a state the selection also has to have an opinion about.
 *
 * The id, never the place. A copy held here would survive its own deletion by
 * however long the next render takes, and the panel would spend that time
 * showing a place that no longer exists. Holding the id means the panel reads
 * the list, and a deleted place is simply not found.
 */
export interface SelectionContextValue {
  /** Null when nothing is selected. */
  selectedId: string | null
  select(id: string): void
  clear(): void
}

/**
 * Undefined outside a provider, so `useSelection` can tell "no provider" apart
 * from "nothing selected" — which otherwise both look like a null id.
 */
export const SelectionContext = createContext<SelectionContextValue | undefined>(undefined)
