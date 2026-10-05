import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronDown } from 'lucide-react'

import { hasActiveFilters } from '@/features/layers/domain/placeFilters'
import { useFilterGroups } from '@/features/layers/hooks/useFilterGroups'
import { useMapView } from '@/features/layers/state/useMapView'
import { FilterRow } from '@/features/layers/ui/FilterRow'

/**
 * Years and countries, behind one disclosure, below the layers.
 *
 * ## Why these are secondary now, and layers are not
 *
 * A year and a country are DERIVED: nobody chose them, they fall out of a date
 * and a coordinate, and every place has whatever it has. They are useful, and
 * they cost the user nothing, which is exactly why they are not the organising
 * scheme — a scheme you did not choose cannot express what you meant.
 *
 * A layer is ASSIGNED. It cost a decision per place, and something a person
 * spent effort on should be the first thing they see when they open the panel
 * they spent it in.
 *
 * Both stay. Demoting these to a disclosure is not a step towards removing
 * them: filtering by year is the one question this map answers that a layer
 * cannot, because the answer changes every time you travel.
 *
 * ## The badge
 *
 * A collapsed section that is quietly hiding half the map is the failure mode
 * of collapsing it at all — the user sees layers all ticked and concludes the
 * places are gone. So the header says so when anything in here is filtering,
 * and it is a `text` dot rather than an accent one: it reports a state, it is
 * not a primary action.
 */
export function FiltersSection() {
  const { t, i18n } = useTranslation('layers')
  const { filters, toggleYear, toggleCountry } = useMapView()
  const { years, countries, countryNames } = useFilterGroups()

  /*
    Starts closed, on both surfaces, unlike the panel around it. That is the
    demotion: what is at the top of the panel is what the panel is now for, and
    a section that opens itself is not below anything.
  */
  const [isOpen, setIsOpen] = useState(false)

  // Years without grouping separators. A year is a label, not a quantity, and
  // `Intl.NumberFormat` would otherwise render 2026 as "2,026" in en-US. Still
  // `Intl` and still the active locale, per the rule — the option is the point.
  const yearFormat = new Intl.NumberFormat(i18n.language, { useGrouping: false })

  // Nothing to say about years or countries when there are no places. Two
  // headings over empty space read as something having failed to load.
  if (years.length === 0 && countries.length === 0) {
    return null
  }

  // Only the two sections in here count. A hidden LAYER is reported by its own
  // row, which is on screen, and repeating it down here would send the user
  // looking for a filter they have not set.
  const isFiltering = hasActiveFilters({ ...filters, hiddenLayers: new Set() })

  return (
    <section className="flex flex-col gap-1">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        aria-expanded={isOpen}
        className="flex min-h-11 w-full items-center gap-2 rounded-lg px-2 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text"
      >
        <h3 className="font-display text-xs tracking-[0.12em] text-text-muted uppercase">
          {t('filters.title')}
        </h3>
        {isFiltering && (
          <span
            className="size-1.5 shrink-0 rounded-full bg-text"
            // A label rather than a bare dot: a screen reader gets the fact,
            // not a decoration it has to guess the meaning of.
            role="img"
            aria-label={t('filters.active')}
          />
        )}
        <ChevronDown
          aria-hidden="true"
          focusable="false"
          className={`ml-auto size-4 shrink-0 text-text-muted transition-transform ${
            isOpen ? '' : '-rotate-90'
          }`}
        />
      </button>

      {/*
        Unmounted when closed, not hidden. The rows are buttons — left in the
        DOM they would stay in the tab order behind a header that says they are
        put away.
      */}
      {isOpen && (
        <div className="flex flex-col gap-4 pt-1">
          {years.length > 0 && (
            <div className="flex flex-col gap-1">
              <h4 className="px-2 pb-1 font-display text-[0.6875rem] tracking-[0.12em] text-text-muted uppercase">
                {t('years.title')}
              </h4>
              {years.map((group) => (
                <FilterRow
                  key={group.value ?? 'undated'}
                  label={group.value === null ? t('years.undated') : yearFormat.format(group.value)}
                  count={group.count}
                  isVisible={!filters.hiddenYears.has(group.value)}
                  onToggle={() => toggleYear(group.value)}
                />
              ))}
            </div>
          )}

          {countries.length > 0 && (
            <div className="flex flex-col gap-1">
              <h4 className="px-2 pb-1 font-display text-[0.6875rem] tracking-[0.12em] text-text-muted uppercase">
                {t('countries.title')}
              </h4>
              {countries.map((group) => (
                <FilterRow
                  key={group.value ?? 'unknown'}
                  label={
                    group.value === null
                      ? t('countries.unknown')
                      : // The code itself where `Intl` cannot name it, which is
                        // what the detail panel shows in the same case.
                        (countryNames.get(group.value) ?? group.value)
                  }
                  count={group.count}
                  isVisible={!filters.hiddenCountries.has(group.value)}
                  onToggle={() => toggleCountry(group.value)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  )
}
