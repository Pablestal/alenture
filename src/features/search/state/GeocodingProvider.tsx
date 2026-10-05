import type { ReactNode } from 'react'

import type { GeocodingRepository } from '@/features/search/data/GeocodingRepository'
import { GeocodingContext } from '@/features/search/state/geocodingContext'

interface GeocodingProviderProps {
  children: ReactNode
  /** The same instance the other consumers are handed. See `geocodingContext`. */
  repository: GeocodingRepository
}

export function GeocodingProvider({ children, repository }: GeocodingProviderProps) {
  return <GeocodingContext value={repository}>{children}</GeocodingContext>
}
