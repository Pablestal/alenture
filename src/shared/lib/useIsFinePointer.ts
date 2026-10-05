import { useCallback, useSyncExternalStore } from 'react'

/**
 * Whether the primary pointer can aim precisely — a mouse, a trackpad, a stylus.
 *
 * This is the app's one rule for telling the two placement surfaces apart, and
 * it is deliberately not a width check: a narrow desktop window is not a phone,
 * and a 32px pin is no easier to hit with a thumb because the browser happens to
 * be maximised.
 *
 * Subscribed rather than read once, because the answer changes within a session:
 * attaching a keyboard and trackpad to a tablet flips a device from coarse to
 * fine while the app is running.
 */
const QUERY = '(pointer: fine)'

function subscribe(onChange: () => void): () => void {
  const list = window.matchMedia(QUERY)
  list.addEventListener('change', onChange)
  return () => list.removeEventListener('change', onChange)
}

function getSnapshot(): boolean {
  return window.matchMedia(QUERY).matches
}

// Under SSR or a prerender there is no pointer to ask about. Coarse is the safer
// guess: the centre-pin surface works with any pointer, while click-to-place
// does not work with a thumb.
function getServerSnapshot(): boolean {
  return false
}

export function useIsFinePointer(): boolean {
  return useSyncExternalStore(
    useCallback(subscribe, []),
    getSnapshot,
    getServerSnapshot,
  )
}
