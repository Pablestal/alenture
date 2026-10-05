import type { FormEvent } from 'react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useAuth } from '@/features/auth/state/useAuth'

type FormState =
  | { kind: 'idle' }
  | { kind: 'sending' }
  | { kind: 'sent'; email: string }
  | { kind: 'error' }

export function MagicLinkForm() {
  const { t } = useTranslation('auth')
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [state, setState] = useState<FormState>({ kind: 'idle' })

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const address = email.trim()
    if (!address || state.kind === 'sending') {
      return
    }

    setState({ kind: 'sending' })
    try {
      await signIn(address)
      setState({ kind: 'sent', email: address })
    } catch {
      // The backend's own message is neither translated nor useful to a person.
      setState({ kind: 'error' })
    }
  }

  if (state.kind === 'sent') {
    return (
      <div className="p-4">
        <p className="font-display text-sm font-bold text-text">{t('signIn.sentTitle')}</p>
        <p className="mt-2 text-sm text-text-muted">
          {t('signIn.sentBody', { email: state.email })}
        </p>
        <button
          type="button"
          onClick={() => setState({ kind: 'idle' })}
          className="mt-3 flex min-h-11 items-center text-sm text-text underline underline-offset-4"
        >
          {t('signIn.sendAgain')}
        </button>
      </div>
    )
  }

  const sending = state.kind === 'sending'

  return (
    <form onSubmit={handleSubmit} className="p-4">
      <p className="font-display text-sm font-bold text-text">{t('signIn.title')}</p>
      <p className="mt-1 text-sm text-text-muted">{t('signIn.description')}</p>

      <label htmlFor="magic-link-email" className="mt-3 block text-xs text-text-muted">
        {t('signIn.emailLabel')}
      </label>
      <input
        id="magic-link-email"
        type="email"
        required
        autoComplete="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        placeholder={t('signIn.emailPlaceholder')}
        aria-invalid={state.kind === 'error'}
        aria-describedby={state.kind === 'error' ? 'magic-link-error' : undefined}
        className="mt-1 h-11 w-full rounded-lg border border-border bg-surface-raised px-3 text-sm text-text placeholder:text-text-muted/60 focus:border-accent focus:outline-none"
      />

      {state.kind === 'error' && (
        <p id="magic-link-error" role="alert" className="mt-2 text-sm text-danger">
          {t('signIn.error')}
        </p>
      )}

      <button
        type="submit"
        disabled={sending}
        className="mt-3 h-11 w-full rounded-lg border border-border bg-surface-raised text-sm font-medium text-text disabled:opacity-60"
      >
        {sending ? t('signIn.sending') : t('signIn.submit')}
      </button>
    </form>
  )
}
