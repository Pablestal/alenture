import auth from './locales/en/auth.json'
import common from './locales/en/common.json'
import layers from './locales/en/layers.json'
import map from './locales/en/map.json'
import places from './locales/en/places.json'
import search from './locales/en/search.json'
import trips from './locales/en/trips.json'

export const defaultNS = 'common'

export const resources = {
  en: { common, map, places, trips, auth, search, layers },
} as const
