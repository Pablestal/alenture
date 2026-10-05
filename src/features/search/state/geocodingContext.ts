import { createContext } from 'react'

import type { GeocodingRepository } from '@/features/search/data/GeocodingRepository'

/**
 * The geocoder itself, handed down rather than imported.
 *
 * It exists because a third consumer arrived: search flies to a result,
 * placement asks what is under a new pin, and editing asks whether a pin that
 * has been dragged a long way is somewhere else now. The first two are given
 * the repository as a prop by `AppProviders`; the third is a hook inside a
 * panel, with no provider of its own to take it.
 *
 * Importing the Photon singleton at the point of use would have been shorter
 * and wrong twice over: it decides which backend a feature talks to from inside
 * the feature, and the one-request-per-second throttle a free service asks for
 * lives in the instance — two of them each keep the limit and together break it.
 */
export const GeocodingContext = createContext<GeocodingRepository | undefined>(undefined)
