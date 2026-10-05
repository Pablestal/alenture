import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { MagicLinkForm } from '@/features/auth/ui/MagicLinkForm'
import { useAuth } from '@/features/auth/state/useAuth'
import { Panel } from '@/shared/ui/Panel'

function SignedIn({ email }: { email: string }) {
  const { t } = useTranslation('auth')
  const { signOut } = useAuth()
  const [pending, setPending] = useState(false)
  const [failed, setFailed] = useState(false)

  async function handleSignOut() {
    setPending(true)
    setFailed(false)
    try {
      await signOut()
      // No cleanup on success: the auth subscription unmounts this panel.
    } catch {
      setFailed(true)
      setPending(false)
    }
  }

  return (
    <div className="p-4">
      <p className="text-xs text-text-muted">{t('account.signedInAs')}</p>
      <p className="mt-0.5 truncate text-sm text-text">{email}</p>

      {failed && (
        <p role="alert" className="mt-2 text-sm text-danger">
          {t('signOut.error')}
        </p>
      )}

      <button
        type="button"
        onClick={handleSignOut}
        disabled={pending}
        className="mt-3 h-11 w-full rounded-lg border border-border bg-surface-raised text-sm font-medium text-text disabled:opacity-60"
      >
        {pending ? t('signOut.pending') : t('signOut.action')}
      </button>
    </div>
  )
}

export function AccountPanel() {
  const { user } = useAuth()

  return (
    <Panel className="pointer-events-auto absolute top-full right-0 mt-2 w-72 shadow-xl">
      {user ? <SignedIn email={user.email} /> : <MagicLinkForm />}
    </Panel>
  )
}
