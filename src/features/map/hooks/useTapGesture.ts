import { useCallback, useRef } from 'react'

/**
 * Past this many pixels between press and release, the gesture was a pan and
 * not a tap. Generous on purpose: a marker sits under the finger that is
 * dragging the map, and a stray few pixels while pressing a 34px pin is a
 * press, not a drag.
 */
const TAP_TOLERANCE = 40

/**
 * Tells a tap on a map marker apart from a pan that happened to start on one.
 *
 * This is needed because a drag beginning on a marker really does pan the map.
 * MapLibre appends marker elements to `map.getCanvasContainer()`, and the
 * handler manager binds `mousedown`/`touchstart` to that same element, so a
 * press on a child marker bubbles straight into `DragPan`. A non-draggable
 * marker's own `mousedown` listener calls `preventDefault()` and never
 * `stopPropagation()` — see `Marker` in maplibre-gl 5.24. So the pin can accept
 * pointer events and the map still moves under it, which is exactly the case
 * this hook exists to disambiguate: without it, every pan begun over a pin ends
 * in an opened panel.
 *
 * Returns handlers for a real `<button>`, so Enter and Space keep working
 * through the browser's own click synthesis — there is no key handling here,
 * and there should not be.
 */
export function useTapGesture(onTap: () => void) {
  const origin = useRef<{ x: number; y: number } | null>(null)

  const onPointerDown = useCallback((event: React.PointerEvent) => {
    origin.current = { x: event.clientX, y: event.clientY }
  }, [])

  const onClick = useCallback(
    (event: React.MouseEvent) => {
      const start = origin.current
      origin.current = null

      /*
        A click the keyboard synthesised, from Enter or Space on the focused
        marker. It carries no meaningful coordinates, and it must not be
        measured against whatever pointer press came before it: a pan that began
        on this pin and ended elsewhere fires no click here, so its origin is
        still sitting in the ref. Measuring against that would reject a keypress
        for a drag the user made minutes ago.

        `detail` is the click count, and 0 is the value for a click no pointer
        made. It is the only thing on the event that says so.
      */
      if (event.detail === 0) {
        onTap()
        return
      }

      if (start) {
        const dx = event.clientX - start.x
        const dy = event.clientY - start.y
        if (Math.hypot(dx, dy) > TAP_TOLERANCE) {
          return
        }
      }

      onTap()
    },
    [onTap],
  )

  return { onPointerDown, onClick }
}
