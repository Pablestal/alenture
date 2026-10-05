import { Trans, useTranslation } from 'react-i18next'

/*
  About 30px tall rather than the 44px the rest of the chrome uses. That is a
  waiver and CLAUDE.md names it: the touch-target rule protects controls the
  user is trying to hit, and nobody goes hunting for a credit. Sized to 44px it
  would be the largest thing along the map's bottom edge.

  Underlined because it is the only place in the app where text is a link, so
  nothing else establishes the convention. Dotted and in `border` rather than
  solid and accented: the accent marks the one primary action in a context, and
  a credit is not an action.
*/
const LINK =
  'inline-block py-2.5 underline decoration-border decoration-dotted underline-offset-2 transition-colors hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text'

/**
 * The ODbL credit for the basemap tiles.
 *
 * This replaces MapLibre's own `AttributionControl`, which was removed rather
 * than restyled. That control's one job is to take the `attribution` string out
 * of the loaded TileJSON and write it into the page as HTML, and the line that
 * does it — `innerHTML = DOM.sanitize(attribHTML)` — is the single call site of
 * the sanitizer that GHSA-jrc7-96c5-q579 reports as bypassable in maplibre-gl
 * 5.x. Removing the control makes that code unreachable: `DOM.sanitize` has no
 * other caller, in the source or in the bundle. (`npm audit` still reports the
 * advisory. It reads the installed version, not what the app can reach, and the
 * two converge at v6.)
 *
 * The credit is static text here instead. Nothing fetched is read, parsed or
 * interpolated: the hrefs and the link text below are literals and React
 * escapes text children, so there is no HTML-parsing step left to bypass. The
 * fix is not a better sanitizer — it is not accepting remote HTML at all.
 *
 * What it costs is that the credit no longer updates itself, so what it must
 * say was read from the TileJSON both basemaps load,
 * `https://tiles.openfreemap.org/planet`, whose `attribution` field was, on
 * 2026-10-05:
 *
 *     <a href="https://openfreemap.org">OpenFreeMap</a>
 *     <a href="https://www.openmaptiles.org/">&copy; OpenMapTiles</a>
 *     Data from <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>
 *
 * Liberty and positron declare the same two sources, so one credit covers both
 * basemaps and nothing here is keyed by which is active. The other source,
 * `ne2_shaded`, carries no attribution at all: Natural Earth is public domain.
 * Re-read that field whenever a basemap is added or a source swapped — this
 * cannot notice for itself that it has gone stale, and under-attributing is the
 * one failure it must not produce.
 */
export function MapAttribution() {
  const { t } = useTranslation('map')

  return (
    /*
      Its own small surface rather than a `Panel`: `--radius-panel` is 16px,
      which on a single 11px line reads as a pill. Translucent and blurred like
      every other piece of chrome, and for a harder reason than consistency —
      `text-muted` is a pale colour, and on the positron basemap pale text
      straight onto light grey is not readable.
    */
    <div className="pointer-events-auto w-fit shrink-0 rounded-md border border-border/60 bg-surface/85 px-2 backdrop-blur-md">
      <p className="text-[11px] leading-none text-text-muted">
        <Trans
          t={t}
          i18nKey="attribution.credit"
          /*
            The placeholders in the locale string are self-closing, so each
            anchor keeps the children written here and the translation decides
            only their order and the words in between. The three names are
            product names and are not translated. The locale file carries a note
            on why a translation has to keep all three.
          */
          components={[
            <a
              key="openfreemap"
              className={LINK}
              href="https://openfreemap.org"
              target="_blank"
              rel="noopener noreferrer"
            >
              OpenFreeMap
            </a>,
            <a
              key="openmaptiles"
              className={LINK}
              href="https://www.openmaptiles.org/"
              target="_blank"
              rel="noopener noreferrer"
            >
              © OpenMapTiles
            </a>,
            <a
              key="openstreetmap"
              className={LINK}
              href="https://www.openstreetmap.org/copyright"
              target="_blank"
              rel="noopener noreferrer"
            >
              OpenStreetMap
            </a>,
          ]}
        />
      </p>
    </div>
  )
}
