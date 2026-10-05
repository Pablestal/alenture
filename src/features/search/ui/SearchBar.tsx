import type { FocusEvent } from 'react'
import { useCallback, useEffect, useRef } from 'react'

import { useSearch } from '@/features/search/state/useSearch'
import { SearchField } from '@/features/search/ui/SearchField'

/**
 * The fine-pointer surface: a bar in the top row, always visible, no opening or
 * closing to do. `/` puts the cursor in it from anywhere.
 *
 * It takes the middle slot of the chrome's top row rather than being centred on
 * the viewport: absolute centring overlaps the brand card on a narrow desktop
 * window, and a bar that sits over the brand is worse than one that sits a
 * little off centre.
 */
export function SearchBar() {
  const { clear } = useSearch()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== '/' || event.metaKey || event.ctrlKey || event.altKey) {
        return
      }
      // Someone typing a slash into a field means the character, not the
      // shortcut — including this field, where it is a valid part of a query.
      const target = event.target
      if (target instanceof HTMLElement && isTextEntry(target)) {
        return
      }
      event.preventDefault()
      inputRef.current?.focus()
      inputRef.current?.select()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Focus leaving the bar ends the search, the same as Escape does: a results
  // panel hanging over the map after the user has clicked away is chrome nobody
  // asked for. `relatedTarget` keeps a click inside the panel from counting.
  const handleBlur = useCallback(
    (event: FocusEvent<HTMLDivElement>) => {
      if (event.currentTarget.contains(event.relatedTarget)) {
        return
      }
      clear()
    },
    [clear],
  )

  return (
    <div className="pointer-events-auto w-full max-w-md" onBlur={handleBlur}>
      <SearchField inputRef={inputRef} onDismiss={() => inputRef.current?.blur()} />
    </div>
  )
}

function isTextEntry(element: HTMLElement): boolean {
  return (
    element instanceof HTMLInputElement ||
    element instanceof HTMLTextAreaElement ||
    element.isContentEditable
  )
}
