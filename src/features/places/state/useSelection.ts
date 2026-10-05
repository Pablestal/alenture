import { use } from 'react'

import type { SelectionContextValue } from '@/features/places/state/selectionContext'
import { SelectionContext } from '@/features/places/state/selectionContext'

export function useSelection(): SelectionContextValue {
  const value = use(SelectionContext)
  if (!value) {
    throw new Error('useSelection must be used inside a SelectionProvider')
  }
  return value
}
