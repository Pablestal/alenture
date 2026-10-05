import { useTranslation } from 'react-i18next'

import type { Layer } from '@/features/layers/domain/Layer'
import { FiltersSection } from '@/features/layers/ui/FiltersSection'
import { LayerIndexSection } from '@/features/layers/ui/LayerIndexSection'
import { MapStyleSection } from '@/features/layers/ui/MapStyleSection'

interface LayersPanelProps {
  deleteError?: string | undefined
  isManaging: boolean
  onToggleManaging(): void
  onRequestDelete(layer: Layer): void
}

/**
 * The panel's body, shared verbatim by both surfaces. The frame differs — a
 * corner panel on a fine pointer, a sheet on a coarse one — and nothing inside
 * it does, for the same reason the place form is one component: two copies
 * become two panels to maintain, and they diverge in the details nobody
 * compares.
 *
 * Three sections, and the order is the argument:
 *
 * 1. **Layers** — the user's own scheme, and now an index of their places.
 *    Assigned, so it leads.
 * 2. **Filters** — years and countries, collapsed. Derived, so they follow.
 *    `FiltersSection` carries the full reasoning.
 * 3. **Map style** — not a view of the places at all, so it sits below both.
 *
 * This component holds no state. Everything the frame needs to put a question
 * over the whole panel is passed through it, because a confirmation that
 * covered only the middle third of a panel would leave the rest of it live.
 */
export function LayersPanel({
  deleteError,
  isManaging,
  onToggleManaging,
  onRequestDelete,
}: LayersPanelProps) {
  const { t } = useTranslation('layers')

  return (
    <div className="flex flex-col gap-5 p-4">
      <LayerIndexSection
        externalError={deleteError}
        isManaging={isManaging}
        onToggleManaging={onToggleManaging}
        onRequestDelete={onRequestDelete}
      />

      <FiltersSection />

      <section className="flex flex-col gap-1">
        <h3 className="px-2 pb-1 font-display text-xs tracking-[0.12em] text-text-muted uppercase">
          {t('style.title')}
        </h3>
        <MapStyleSection />
      </section>
    </div>
  )
}
