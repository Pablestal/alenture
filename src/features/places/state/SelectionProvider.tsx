import type { ReactNode } from 'react'
import { useCallback, useMemo, useState } from 'react'

import type { SelectionContextValue } from '@/features/places/state/selectionContext'
import { SelectionContext } from '@/features/places/state/selectionContext'

/**
 * One id and two ways to change it. There is no "is this place still there?"
 * check here on purpose: this provider does not know the list, and a selection
 * pointing at a place that has gone is a question the panel answers by finding
 * nothing and closing.
 */
export function SelectionProvider({ children }: { children: ReactNode }) {
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const select = useCallback((id: string) => setSelectedId(id), [])
  const clear = useCallback(() => setSelectedId(null), [])

  const value = useMemo<SelectionContextValue>(
    () => ({ selectedId, select, clear }),
    [selectedId, select, clear],
  )

  return <SelectionContext value={value}>{children}</SelectionContext>
}
