import type { ReactNode } from 'react'
import { useId } from 'react'

interface FieldProps {
  label: string
  /** Already translated. Undefined when the field is fine. */
  error?: string | undefined
  /** Shown only when there is no error — an error replaces it rather than stacking. */
  hint?: string | undefined
  /**
   * Receives the ids to wire up. Controls take `id` themselves so the label's
   * `htmlFor` reaches them, and `aria-describedby` so a screen reader reads the
   * error with the field rather than as loose text.
   */
  children(ids: { id: string; describedBy: string | undefined }): ReactNode
}

/**
 * Label, control, and the one place a field's error is allowed to render.
 *
 * Every field goes through this so no control invents its own error styling and
 * none of them can quietly forget to associate the message with the input.
 */
export function Field({ label, error, hint, children }: FieldProps) {
  const id = useId()
  const messageId = `${id}-message`
  const message = error ?? hint

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-xs font-medium text-text-muted">
        {label}
      </label>
      {children({ id, describedBy: message ? messageId : undefined })}
      {message && (
        <p id={messageId} className={`text-xs tabular-nums ${error ? 'text-danger' : 'text-text-muted'}`}>
          {message}
        </p>
      )}
    </div>
  )
}

interface FieldsetProps {
  label: string
  error?: string | undefined
  hint?: string | undefined
  children: ReactNode
}

/**
 * The same shape for a group of controls, or for read-only figures, where
 * there is no single input for a `<label>` to point at. `aria-labelledby` does
 * the job `htmlFor` does above.
 */
export function Fieldset({ label, error, hint, children }: FieldsetProps) {
  const id = useId()
  const labelId = `${id}-label`
  const messageId = `${id}-message`
  const message = error ?? hint

  return (
    <div className="flex flex-col gap-1.5">
      <span id={labelId} className="text-xs font-medium text-text-muted">
        {label}
      </span>
      <div
        role="group"
        aria-labelledby={labelId}
        aria-describedby={message ? messageId : undefined}
      >
        {children}
      </div>
      {message && (
        <p id={messageId} className={`text-xs tabular-nums ${error ? 'text-danger' : 'text-text-muted'}`}>
          {message}
        </p>
      )}
    </div>
  )
}
