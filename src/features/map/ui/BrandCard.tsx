import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { usePlaces } from '@/features/places/state/usePlaces'
import { Panel } from '@/shared/ui/Panel'

export function BrandCard() {
  const { t } = useTranslation('common')
  const { places, status } = usePlaces()

  const countryCount = useMemo(() => {
    const codes = new Set<string>()
    for (const place of places) {
      // A place whose country could not be resolved is not a country visited.
      if (place.countryCode !== null) {
        // Case-folded so a stray lowercase code cannot count as a second country.
        codes.add(place.countryCode.toUpperCase())
      }
    }
    return codes.size
  }, [places])

  return (
    <Panel className="pointer-events-auto px-4 py-3">
      <p className="font-display text-lg font-bold tracking-[0.18em] text-text">{t('app.name')}</p>
      {/*
        Figures appear only once the list is real. Under 'idle' (signed out) and
        'loading' the list is empty for reasons that have nothing to do with how
        much you have travelled, and "0 places" would be a lie in both.
      */}
      {status === 'ready' && (
        <p className="mt-1 font-display text-xs text-text-muted tabular-nums">
          {t('brand.places', { count: places.length })}
          {' · '}
          {t('brand.countries', { count: countryCount })}
        </p>
      )}
    </Panel>
  )
}
