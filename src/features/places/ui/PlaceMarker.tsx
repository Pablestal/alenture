import { useTapGesture } from '@/features/map/hooks/useTapGesture'
import { PinShape } from '@/shared/ui/PinShape'

interface PlaceMarkerProps {
  /** The city name, used as the marker's accessible name. */
  label: string
  /** Selected pins take the accent, exactly as the placement pin does. */
  isSelected: boolean
  /**
   * False while a placement is running: the pin is still there and still says
   * where a place is, but pressing it must do nothing. The user is mid-flow.
   */
  isInteractive: boolean
  onSelect(): void
}

/**
 * A saved place: the shared pin on the surface tokens, or on the accent while
 * it is the one being read.
 *
 * Every unselected marker renders identically. There is nothing to distinguish
 * them by — every place is a city, and the thing that will eventually vary the
 * pin is population, which no place has yet.
 *
 * Selection borrows the placement pin's fill and stroke rather than inventing a
 * third state. It is the same claim in every case — this is the map object the
 * screen is currently about — and the accent says exactly that.
 *
 * There is never more than one accented pin. A placement drops the selected pin
 * back to surface for its duration, and an edit replaces the edited place's
 * marker entirely: `PlaceMarkers` skips it, and `EditPinMarker` draws it at the
 * draft coordinates instead.
 *
 * A real `<button>`, so it is in the tab order and answers Enter and Space
 * without a key handler. Pressing it does not focus it — MapLibre's marker
 * element calls `preventDefault()` on `mousedown` to stop exactly that — which
 * is the behaviour we want anyway: a focus ring left behind on the map after a
 * click is noise, and keyboard users still reach it by tabbing.
 */
export function PlaceMarker({ label, isSelected, isInteractive, onSelect }: PlaceMarkerProps) {
  const tap = useTapGesture(onSelect)

  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={isSelected}
      // Inert rather than absent while placing: removing it from the tab order
      // is right, and so is leaving the pin visible where it always was.
      disabled={!isInteractive}
      {...tap}
      /*
        A focus ring in `text`, not `accent`: focus is not the primary action,
        and the accent is not an emphasis colour. Only on `focus-visible`, so it
        appears for the keyboard and not under a press.
      */
      className="block cursor-pointer rounded-lg border-0 bg-transparent p-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text disabled:cursor-default"
    >
      <PinShape
        fill={isSelected ? 'fill-accent' : 'fill-surface/85'}
        /*
          The resting stroke is not decoration. M6 added it to separate adjacent
          pins: at country zoom, Ghent and Bruges overlapped into a single
          ambiguous shape, and a hairline in `text` is what gives two touching
          discs an edge between them.

          It solves that against the DARK basemap and only against it. Over the
          light style added in M11, a 25% cream line on a light background is
          effectively invisible, so the light map has the merged-pin problem
          back — the problem did not go away, the fix did.

          Left as it is deliberately: whatever separates two pins on a light
          background is a colour that does not exist in the palette yet, which
          makes it the second token set, not a value to tune here. If you have
          arrived because two cities merged into one pin on the light map, this
          is the history, and it is a known gap rather than a regression.
        */
        stroke={isSelected ? 'stroke-surface' : 'stroke-text/25'}
        strokeWidth={isSelected ? 2 : 1}
        className={isSelected ? 'drop-shadow-lg' : 'drop-shadow-md'}
      />
    </button>
  )
}
