import type { ComponentPropsWithoutRef } from 'react'

/**
 * A floating surface over the map: translucent, blurred, bordered.
 *
 * Carries no padding — callers differ — and no positioning, which belongs to
 * whichever chrome layer owns the corner.
 */
export function Panel({ className = '', ...props }: ComponentPropsWithoutRef<'div'>) {
  return (
    <div
      className={`rounded-panel border border-border/60 bg-surface/85 backdrop-blur-md ${className}`}
      {...props}
    />
  )
}
