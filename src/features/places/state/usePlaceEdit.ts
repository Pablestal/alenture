import { use } from 'react'

import type { PlaceEditContextValue } from '@/features/places/state/placeEditContext'
import { PlaceEditContext } from '@/features/places/state/placeEditContext'

export function usePlaceEdit(): PlaceEditContextValue {
  const value = use(PlaceEditContext)
  if (!value) {
    throw new Error('usePlaceEdit must be used inside a PlaceEditProvider')
  }
  return value
}
