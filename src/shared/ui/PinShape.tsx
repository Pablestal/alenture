/**
 * The map pin outline, and the only place it is drawn.
 *
 * Every pin on the map is this path — a saved place, the one being read, the
 * one being placed, the one being moved, the fixed centre pin — and they must
 * be recognisably the same object: placement is a promise about what the marker
 * will be, and moving one is that promise being kept. What varies between them
 * is state (fill, stroke), never shape.
 *
 * Deliberately not a list of callers. It was one, and it went stale twice as
 * states were added; what matters is that there is no sixth kind of pin, not
 * how many components currently reach for this one.
 *
 * One `<path>` rather than a disc plus a tail: the saved fill is translucent, so
 * two overlapping shapes would show their seam straight through it.
 */

/** Drawn dimensions. Exported so a caller can offset by them rather than guess. */
export const PIN_WIDTH = 34
export const PIN_HEIGHT = 43

/**
 * An r=16 circle centred at (17,17), with the two tangents from the tip at
 * (17,42). Meeting the curve at the tangent points is what keeps the outline
 * free of a corner where the straight edges arrive. The 1px margin inside the
 * viewBox is for the stroke, which straddles the path.
 */
const PIN_PATH = 'M4.71 27.24 A16 16 0 1 1 29.29 27.24 L17 42 Z'

interface PinShapeProps {
  /** A Tailwind fill utility, e.g. `fill-accent`. */
  fill: string
  /**
   * A Tailwind stroke utility, e.g. `stroke-text/25`.
   *
   * The resting stroke separates pins that touch, rather than outlining one
   * — see the note where `PlaceMarker` picks its value, including what that
   * costs on the light basemap.
   */
  stroke: string
  strokeWidth?: number
  /**
   * The accessible name. Omitted, the pin is hidden from assistive technology —
   * which is right for the placement pins, where the announcement belongs to the
   * surrounding flow rather than to a shape that follows the map.
   */
  label?: string
  className?: string
}

export function PinShape({
  fill,
  stroke,
  strokeWidth = 1,
  label,
  className = '',
}: PinShapeProps) {
  return (
    <svg
      width={PIN_WIDTH}
      height={PIN_HEIGHT}
      viewBox={`0 0 ${PIN_WIDTH} ${PIN_HEIGHT}`}
      // `block` is load-bearing. Do not remove it.
      //
      // An inline SVG sits on a text baseline, and the descender under it makes
      // the element's box taller than the drawing: 47px of box for 43px of pin,
      // measured. Any caller offsetting by the pin's own height — CenterPin
      // does, to put the tip on the viewport centre — then offsets by half of
      // the wrong number and the tip lands 4px above the point it claims to
      // mark. Nothing looks broken; the coordinates are simply wrong, and on the
      // touch surface there is no cursor to notice it against.
      //
      // drop-shadow, not shadow: a box shadow traces the element's rectangle,
      // and everything outside the path is transparent.
      className={`block ${fill} ${stroke} ${className}`}
      {...(label === undefined
        ? { 'aria-hidden': true as const }
        : { role: 'img' as const, 'aria-label': label })}
    >
      <path d={PIN_PATH} strokeWidth={strokeWidth} />
    </svg>
  )
}
