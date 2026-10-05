import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import type { LayerIndexGroup } from '@/features/layers/domain/layerIndex'
import { buildLayerIndex } from '@/features/layers/domain/layerIndex'
import { useLayers } from '@/features/layers/state/useLayers'
import { usePlaces } from '@/features/places/state/usePlaces'

/**
 * The panel's index: the user's layers in their order, each with its places,
 * then Unassigned.
 *
 * `useMemo` over both lists, which is what makes a place saved into a layer
 * appear under it with no refetch — the optimistic entry is already in that
 * array before the request lands, and so is the optimistic layer.
 *
 * The seam this sits on is the same one `useFilterGroups` sits on: neither
 * provider knows the other's list, and the join happens here, where both are
 * being read to draw one panel.
 */
export function useLayerIndex(): LayerIndexGroup[] {
  const { places } = usePlaces()
  const { layers } = useLayers()
  const { i18n } = useTranslation()
  const locale = i18n.language

  return useMemo(
    () => buildLayerIndex(places, layers, locale),
    [places, layers, locale],
  )
}
