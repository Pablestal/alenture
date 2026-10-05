import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useAuth } from '@/features/auth/state/useAuth'
import { AccountPanel } from '@/features/auth/ui/AccountPanel'

function PersonIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="size-5"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
    >
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 19.5c1.4-3.2 4-4.8 7-4.8s5.6 1.6 7 4.8" />
    </svg>
  )
}

export function AccountButton() {
  const { t } = useTranslation('auth')
  const { user, status } = useAuth()
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // While the session is still resolving — reading storage, or consuming a token
  // the magic link left in the URL — the button is inert. Opening it here would
  // flash a sign-in form at someone who is already signed in.
  const loading = status === 'loading'

  useEffect(() => {
    if (!open) {
      return
    }

    function handlePointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  // Signing in or out swaps the panel's contents under the pointer; close it so
  // the next state is a deliberate open.
  useEffect(() => {
    setOpen(false)
  }, [user?.id])

  const label = loading
    ? t('account.checkingSession')
    : open
      ? t('account.closeMenu')
      : t('account.openMenu')

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((isOpen) => !isOpen)}
        disabled={loading}
        aria-label={label}
        aria-expanded={open}
        aria-haspopup="dialog"
        className="pointer-events-auto flex size-11 items-center justify-center rounded-full border border-border/60 bg-surface/85 text-text backdrop-blur-md disabled:opacity-60"
      >
        {user ? (
          <span className="font-display text-base font-bold">{user.initial}</span>
        ) : (
          <PersonIcon />
        )}
      </button>

      {open && <AccountPanel />}
    </div>
  )
}
