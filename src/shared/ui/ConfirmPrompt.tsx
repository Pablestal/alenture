interface ConfirmPromptProps {
  /** Names the dialogue for assistive technology. Already translated. */
  title: string
  message: string
  /** The safe way out. Autofocused, and first in the DOM. */
  cancelLabel: string
  /** The one that does the thing. Rendered in `danger`. */
  confirmLabel: string
  /** True while the confirmed action is in flight. Both buttons go inert. */
  isBusy?: boolean
  onCancel(): void
  onConfirm(): void
}

/**
 * A question that covers the panel it belongs to, rather than floating over the
 * map: the question is about what is in the panel, and the map behind stays
 * visible and interactive either way.
 *
 * Shared by the discard prompt and the delete prompt because they are the same
 * object with different words — one panel-covering sheet, one destructive
 * button on the right, one safe answer autofocused on the left. Two copies
 * would be two chances for the destructive one to end up under a stray Enter.
 *
 * The caller is responsible for Escape. It means different things depending on
 * what else is open — here it always backs out of the question, but the
 * container is what knows whether a question is open at all.
 */
export function ConfirmPrompt({
  title,
  message,
  cancelLabel,
  confirmLabel,
  isBusy = false,
  onCancel,
  onConfirm,
}: ConfirmPromptProps) {
  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-label={title}
      className="absolute inset-0 flex flex-col justify-end gap-3 rounded-panel bg-surface/95 p-4 backdrop-blur-md"
    >
      <p className="text-sm text-text">{message}</p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={isBusy}
          // First and autofocused: the safe answer is the one a stray Enter hits.
          autoFocus
          className="min-h-11 flex-1 rounded-full border border-border/60 px-4 text-sm text-text disabled:opacity-50"
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={isBusy}
          className="min-h-11 flex-1 rounded-full bg-danger px-4 text-sm font-medium text-text disabled:opacity-50"
        >
          {confirmLabel}
        </button>
      </div>
    </div>
  )
}
