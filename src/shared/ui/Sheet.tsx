import type { ReactNode } from 'react'
import { useCallback, useRef, useState } from 'react'

interface SheetProps {
  children: ReactNode
  /**
   * Rendered over the whole sheet rather than inside its scroll area. Every
   * caller passes a `ConfirmPrompt`; nothing else has needed it yet.
   *
   * It has to be a sibling of the scroller, not a child of it. `ConfirmPrompt`
   * is `absolute inset-0`, and inside a scrolled element that pins it to the
   * TOP OF THE CONTENT: scroll down two screens and the question is two screens
   * above you, over content you cannot see, while the sheet underneath stays on
   * screen and live.
   *
   * Invisible while a sheet is short, which is why all three of them shipped
   * without it and why this is a prop rather than a note in a review. `Panel`
   * needs the same treatment and gets it by construction — the scroller is an
   * inner element there too.
   */
  overlay?: ReactNode
  /** The drag handle's accessible name — it is a real control, not decoration. */
  handleLabel: string
  /** Called when the sheet is dragged far enough down to be dismissed. */
  onDismiss(): void
}

/** Past this many pixels of downward drag, letting go dismisses. */
const DISMISS_THRESHOLD = 96

/**
 * A bottom sheet at 75% of the viewport.
 *
 * There is deliberately no scrim. The map behind stays interactive — the pin is
 * still draggable while this is open — and a full-screen backdrop would be
 * exactly the thing that stops it.
 *
 * Built here rather than inside the place form because the layers panel needs
 * the same shape. It has both since M6, and the panel has since grown into a
 * scrollable index — which is what `overlay` exists for.
 */
export function Sheet({ children, overlay, handleLabel, onDismiss }: SheetProps) {
  const [dragOffset, setDragOffset] = useState(0)
  const startY = useRef<number | null>(null)

  const handlePointerDown = useCallback((event: React.PointerEvent) => {
    startY.current = event.clientY
    event.currentTarget.setPointerCapture(event.pointerId)
  }, [])

  const handlePointerMove = useCallback((event: React.PointerEvent) => {
    if (startY.current === null) {
      return
    }
    // Downward only. Dragging up would grow the sheet past its height, and
    // there is nothing above it to reveal.
    setDragOffset(Math.max(0, event.clientY - startY.current))
  }, [])

  const handlePointerUp = useCallback(
    (event: React.PointerEvent) => {
      if (startY.current === null) {
        return
      }
      const travelled = event.clientY - startY.current
      startY.current = null
      setDragOffset(0)
      if (travelled > DISMISS_THRESHOLD) {
        onDismiss()
      }
    },
    [onDismiss],
  )

  const isDragging = startY.current !== null

  return (
    <div
      className="pointer-events-auto relative flex w-full flex-col rounded-t-panel border-x border-t border-border/60 bg-surface/95 backdrop-blur-md"
      style={{
        height: '75dvh',
        transform: `translateY(${dragOffset}px)`,
        // Follows the finger while dragging, eases back when it lets go.
        transition: isDragging ? undefined : 'transform 200ms ease-out',
        // The sheet reaches the bottom edge of the screen, so its own content
        // has to clear the home indicator.
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <button
        type="button"
        aria-label={handleLabel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        // 44px of target around a 4px-tall grabber: the visible line is the
        // affordance, the button is what a thumb actually has to hit.
        className="flex h-11 w-full shrink-0 cursor-grab touch-none items-center justify-center active:cursor-grabbing"
      >
        <span aria-hidden="true" className="h-1 w-10 rounded-full bg-text-muted/50" />
      </button>
      <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      {overlay}
    </div>
  )
}
