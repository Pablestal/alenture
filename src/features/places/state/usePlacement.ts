import { use } from 'react'

import type { PlacementContextValue } from '@/features/places/state/placementContext'
import { PlacementContext } from '@/features/places/state/placementContext'

export function usePlacement(): PlacementContextValue {
  const value = use(PlacementContext)
  if (!value) {
    throw new Error('usePlacement must be used inside a PlacementProvider')
  }
  return value
}
