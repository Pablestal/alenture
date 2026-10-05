/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** MapLibre style URL for the dark basemap. Required; see `.env.example`. */
  readonly VITE_MAP_STYLE_DARK_URL: string
  /** MapLibre style URL for the light basemap. Required, and a partner to the
      one above: defaulting either lets the layers panel switch between two
      different providers without saying so. */
  readonly VITE_MAP_STYLE_LIGHT_URL: string
  /** Photon-compatible search endpoint. Required; see `.env.example`. */
  readonly VITE_GEOCODING_API_URL: string
  /** Photon-compatible reverse endpoint. Required, and separate by design. */
  readonly VITE_GEOCODING_REVERSE_URL: string
  /** Supabase project URL. */
  readonly VITE_SUPABASE_URL: string
  /** Supabase anon key. Public by design; RLS protects the data. */
  readonly VITE_SUPABASE_ANON_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
