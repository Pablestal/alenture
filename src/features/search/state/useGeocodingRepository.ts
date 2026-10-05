import { use } from 'react'

import type { GeocodingRepository } from '@/features/search/data/GeocodingRepository'
import { GeocodingContext } from '@/features/search/state/geocodingContext'

export function useGeocodingRepository(): GeocodingRepository {
  const repository = use(GeocodingContext)
  if (!repository) {
    throw new Error('useGeocodingRepository must be used inside a GeocodingProvider')
  }
  return repository
}
