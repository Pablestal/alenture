import type { MapStyleId } from '@/features/layers/domain/mapStyle'
import { requireEnv } from '@/shared/lib/env'

/**
 * The one place that turns a style id into a URL.
 *
 * Outside `domain/` because it reads configuration, and outside `state/`
 * because nothing about it is stateful — it is the same lookup for the whole
 * life of the process.
 *
 * Read at module evaluation, which is what makes a missing variable stop the
 * app at startup rather than blanking the map the first time someone opens the
 * layers panel. See `shared/lib/env.ts` for why both are required.
 */
export const MAP_STYLE_URLS: Readonly<Record<MapStyleId, string>> = {
  dark: requireEnv('VITE_MAP_STYLE_DARK_URL'),
  light: requireEnv('VITE_MAP_STYLE_LIGHT_URL'),
}
