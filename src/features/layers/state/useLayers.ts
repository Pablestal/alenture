import { use } from 'react'

import type { LayersContextValue } from '@/features/layers/state/layersContext'
import { LayersContext } from '@/features/layers/state/layersContext'

export function useLayers(): LayersContextValue {
  const value = use(LayersContext)
  if (!value) {
    throw new Error('useLayers must be used inside a LayersProvider')
  }
  return value
}
