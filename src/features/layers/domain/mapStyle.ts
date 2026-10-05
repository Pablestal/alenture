/**
 * Which basemap the canvas is drawing.
 *
 * Two, not three. There is deliberately no 'satellite': every key-free imagery
 * source is a raster tile template rather than a style document, so it could
 * not be an env var alongside the other two — it would need a style JSON built
 * by hand in the app, and the section would then have one option shaped
 * differently from its neighbours. It is also the option this map has least use
 * for: imagery does not help you decide which square you stood in.
 *
 * Ids rather than URLs, and no URLs in this file at all: `domain/` is plain
 * TypeScript and knows nothing about configuration. `mapStyleUrls.ts` maps
 * these to the env vars.
 */
export type MapStyleId = 'dark' | 'light'

/** The order the panel lists them in. Dark first — it is what the app defaults to. */
export const MAP_STYLE_IDS: readonly MapStyleId[] = ['dark', 'light']

export const DEFAULT_MAP_STYLE_ID: MapStyleId = 'dark'
