import { use } from 'react'

import type { MapViewContextValue } from '@/features/layers/state/mapViewContext'
import { MapViewContext } from '@/features/layers/state/mapViewContext'

export function useMapView(): MapViewContextValue {
  const value = use(MapViewContext)
  if (!value) {
    throw new Error('useMapView must be used inside a MapViewProvider')
  }
  return value
}
