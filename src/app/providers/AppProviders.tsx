import type { ReactNode } from 'react'
import { Suspense } from 'react'
import { I18nextProvider } from 'react-i18next'
import { MapProvider } from 'react-map-gl/maplibre'

import { AuthProvider } from '@/features/auth/state/AuthProvider'
import { supabaseLayersRepository } from '@/features/layers/data/SupabaseLayersRepository'
import { LayersProvider } from '@/features/layers/state/LayersProvider'
import { MapViewProvider } from '@/features/layers/state/MapViewProvider'
import { supabasePlacesRepository } from '@/features/places/data/SupabasePlacesRepository'
import { supabaseVisitsRepository } from '@/features/places/data/SupabaseVisitsRepository'
import { PlaceEditProvider } from '@/features/places/state/PlaceEditProvider'
import { PlacementProvider } from '@/features/places/state/PlacementProvider'
import { PlacesProvider } from '@/features/places/state/PlacesProvider'
import { SelectionProvider } from '@/features/places/state/SelectionProvider'
import { photonGeocodingRepository } from '@/features/search/data/PhotonGeocodingRepository'
import { GeocodingProvider } from '@/features/search/state/GeocodingProvider'
import { SearchProvider } from '@/features/search/state/SearchProvider'
import i18n from '@/shared/i18n'

/**
 * The one place that decides which backend the app talks to. `PlacesProvider`
 * takes whatever it is handed, so swapping in a local implementation later is
 * an edit to this file alone.
 *
 * One geocoding repository, handed to both `PlacementProvider` and
 * `SearchProvider`. It must stay one instance: the throttle a free service asks
 * for lives inside it, and two would each keep the limit while together
 * breaking it.
 */
const placesRepository = supabasePlacesRepository
const layersRepository = supabaseLayersRepository
const visitsRepository = supabaseVisitsRepository
const geocodingRepository = photonGeocodingRepository

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <I18nextProvider i18n={i18n}>
      <Suspense fallback={null}>
        <AuthProvider>
          {/* Inside AuthProvider: the places load is driven by the auth status. */}
          <PlacesProvider repository={placesRepository} visitsRepository={visitsRepository}>
            {/*
              The user's own layers, and the records they are. Inside
              PlacesProvider because deleting one has to tell the places list
              about it; outside MapViewProvider because the lens below holds
              which layers are TICKED and this holds which ones exist — see
              `layersContext` for why those are two things.
            */}
            <LayersProvider repository={layersRepository}>
              {/*
                Inside PlacesProvider and holding none of it: the list of places
                and the view of that list are different concerns. It sees no
                places and no layers at all — the panel's rows are derived where
                they are shown. Outside PlacementProvider because
                `useVisiblePlaces` reads both.
              */}
              <MapViewProvider>
                <PlacementProvider geocodingRepository={geocodingRepository}>
                  {/*
                    Beside PlacementProvider rather than under it, and holding no
                    more than an id: a selected place and a placement in progress
                    are separate states that happen to share a corner of the
                    screen.
                  */}
                  <SelectionProvider>
                    {/*
                      The same instance the two providers above are handed, and
                      the reason it is a provider at all: the edit flow's rename
                      offer is a hook inside a panel, with no provider of its own
                      to be given the repository as a prop.
                    */}
                    <GeocodingProvider repository={geocodingRepository}>
                      {/* The draft of a saved place being edited — shared by the
                          panel that holds the form and the map that holds its pin. */}
                      <PlaceEditProvider>
                        {/*
                          MapProvider registers the map under its `id` so anything
                          outside MapCanvas can reach the instance with `useMap()`.
                          SearchProvider sits inside it: flying to a result needs
                          that instance.
                        */}
                        <MapProvider>
                          <SearchProvider repository={geocodingRepository}>
                            {children}
                          </SearchProvider>
                        </MapProvider>
                      </PlaceEditProvider>
                    </GeocodingProvider>
                  </SelectionProvider>
                </PlacementProvider>
              </MapViewProvider>
            </LayersProvider>
          </PlacesProvider>
        </AuthProvider>
      </Suspense>
    </I18nextProvider>
  )
}
