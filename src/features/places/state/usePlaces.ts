import { use } from 'react'

import type { PlacesContextValue } from '@/features/places/state/placesContext'
import { PlacesContext } from '@/features/places/state/placesContext'

export function usePlaces(): PlacesContextValue {
  const value = use(PlacesContext)
  if (!value) {
    throw new Error('usePlaces must be used inside a PlacesProvider')
  }
  return value
}
