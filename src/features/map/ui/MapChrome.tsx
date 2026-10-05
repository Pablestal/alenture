import { AccountButton } from '@/features/auth/ui/AccountButton'
import { LayersContainer } from '@/features/layers/ui/LayersContainer'
import { CenterPin } from '@/features/map/ui/CenterPin'
import { PlacementConfirmBar } from '@/features/map/ui/PlacementConfirmBar'
import { PlacementTopBar } from '@/features/map/ui/PlacementTopBar'
import { PlaceDetailContainer } from '@/features/places/ui/PlaceDetailContainer'
import { PlaceFormContainer } from '@/features/places/ui/PlaceFormContainer'
import { EmptyPlacesHint } from '@/features/places/ui/EmptyPlacesHint'
import { PlacesErrorPanel } from '@/features/places/ui/PlacesErrorPanel'
import { SearchBar } from '@/features/search/ui/SearchBar'
import { SearchOverlay } from '@/features/search/ui/SearchOverlay'
import { usePlacement } from '@/features/places/state/usePlacement'
import { useSelection } from '@/features/places/state/useSelection'
import { useIsFinePointer } from '@/shared/lib/useIsFinePointer'

import { AddPlaceButton } from './AddPlaceButton'
import { BrandCard } from './BrandCard'

/**
 * The strip the bottom-left column leaves clear below itself for MapLibre's
 * attribution control.
 *
 * The control lives at the map's own bottom-left corner and cannot move: the
 * other three corners are the brand card, the account button and the add
 * button. It knows nothing about this layer's insets — its CSS puts a 24px
 * compact control on a 10px margin, so it occupies the bottom 34px of the
 * viewport flat. This layer's own inset is already 16px on a phone and 24px
 * from `md` up, so 20px clears it on both.
 *
 * The ODbL requires the attribution. Covering it is not an option, which is why
 * this is a reserved strip rather than a guess at whether anything overlaps.
 */
const ATTRIBUTION_STRIP = '20px'

/**
 * The floating layer over the map. It owns the edge insets (16px on mobile,
 * 24px from `md` up, plus the device safe areas) so the individual pieces of
 * chrome never position themselves.
 */
export function MapChrome() {
  const { mode } = usePlacement()
  const { selectedId } = useSelection()
  const isFinePointer = useIsFinePointer()
  const isPlacing = mode === 'placing'
  const isEditing = mode === 'editing'
  // Placement wins the slot. Both want the same corner, and a placement is
  // something the user is part way through — the detail panel is a thing they
  // can come back to, and does, because the selection outlives the flow.
  const isDetailOpen = selectedId !== null && mode === 'idle'
  // Search is how you get to a city you have not reached yet. Once a point is
  // being placed or edited, the destination is already chosen and the field
  // would only be somewhere else to lose the pin to.
  const showSearch = !isPlacing && !isEditing

  /*
    Bottom-left, stacked: the two transient notices sit ABOVE the layers panel
    rather than beside it — they are things that happened, and the panel is
    furniture that is always there. At most one notice renders; an empty list
    and a failed load are exclusive.

    `min-h-0` all the way down, and `justify-end` so a short column still sits
    on the floor. That chain is what lets the layers panel be as tall as its
    content and stop at the top of the chrome area rather than running off the
    screen — it grew from a card of filters into an index of every place.
  */
  const bottomLeft = (className = 'flex') => (
    <div
      className={`${className} min-h-0 flex-col justify-end gap-2 self-stretch`}
      style={{ marginBottom: ATTRIBUTION_STRIP }}
    >
      <PlacesErrorPanel />
      <EmptyPlacesHint />
      <LayersContainer />
    </div>
  )

  return (
    <div
      className="pointer-events-none absolute inset-0 flex flex-col justify-between [--chrome-inset:16px] md:[--chrome-inset:24px]"
      style={{
        paddingTop: 'calc(var(--chrome-inset) + env(safe-area-inset-top))',
        paddingRight: 'calc(var(--chrome-inset) + env(safe-area-inset-right))',
        paddingBottom: 'calc(var(--chrome-inset) + env(safe-area-inset-bottom))',
        paddingLeft: 'calc(var(--chrome-inset) + env(safe-area-inset-left))',
      }}
    >
      {/*
        The centre pin sits behind the rest of the chrome and ignores this
        layer's padding — it must line up with the centre of the map viewport,
        not the centre of the inset area.
      */}
      {isPlacing && !isFinePointer && <CenterPin />}

      {/*
        Top row: placement replaces the left-hand slot only. The account button
        stays put, so entering and leaving the mode never shifts it.
      */}
      <div className="flex shrink-0 items-start justify-between gap-3">
        {isPlacing ? <PlacementTopBar /> : <BrandCard />}

        {/*
          The middle slot, on a fine pointer only. On a coarse one the field
          arrives full width over the map instead — there is no room for it
          between the brand card and the account button.
        */}
        {showSearch && isFinePointer && (
          <div className="flex min-w-0 flex-1 justify-center">
            <SearchBar />
          </div>
        )}

        <div className="flex shrink-0 items-start gap-2">
          {showSearch && !isFinePointer && <SearchOverlay />}
          <AccountButton />
        </div>
      </div>

      {isEditing ? (
        /*
          The form. Full height minus the chrome insets on a fine pointer; a
          sheet across the bottom on a coarse one, which owns its own height.
        */
        <div className={`flex min-h-0 flex-1 ${isFinePointer ? 'justify-end py-0' : 'items-end'}`}>
          <PlaceFormContainer />
        </div>
      ) : isPlacing ? (
        /*
          Bottom centre on a coarse pointer, right-hand column on a fine one —
          where the form's panel lands, so the bar does not jump between them.
        */
        <div className={`flex ${isFinePointer ? 'justify-end' : 'justify-center'}`}>
          <PlacementConfirmBar />
        </div>
      ) : isDetailOpen ? (
        /*
          The detail panel, in the slot the form uses — same width, same edge,
          same frame. Reading a place back and filling one in are the same kind
          of thing in the same place, and a panel that moved between the two
          would say they were not.

          The add button goes for the duration. It would sit under the panel on
          a fine pointer and behind the sheet on a coarse one, and there is a
          way back to it that costs one press of Escape.

          The layers panel does NOT go, on a fine pointer. It is bottom-left and
          the detail panel is on the right, so they do not collide — and now
          that the panel is an index, pressing a place in it is how the detail
          panel got opened. An index that dismissed itself on every use would be
          an index you could use exactly once.

          On a coarse pointer both are sheets and cannot share the bottom of the
          screen, so the column goes and `LayersContainer` closes its own sheet
          on selection.
        */
        <div className={`flex min-h-0 flex-1 ${isFinePointer ? 'items-stretch justify-between gap-3' : 'items-end'}`}>
          {/*
            Hidden below `lg`. The two panels are 320px and 400px, and with the
            chrome insets and the gap they need about 790px to stand side by
            side — a fine pointer says nothing about how wide the window is, and
            a half-maximised browser is a fine pointer at 700px. The detail
            panel is the one the user just asked for, so it is the one that
            stays; below the breakpoint the behaviour falls back to what the
            coarse surface does.
          */}
          {isFinePointer && bottomLeft('hidden lg:flex')}
          <PlaceDetailContainer />
        </div>
      ) : (
        /*
          Bottom row: the left-hand column sits alongside the add button rather
          than over it, so nothing ever blocks the primary action.

          This is the idle branch, and it is most of why the layers control
          needs no mode check of its own: a placement and an edit each replace
          this row entirely. Filters do not apply during those flows, and
          neither does the panel that sets them. An open detail panel is the
          exception and renders the column itself — see the branch above.
        */
        <div className="flex min-h-0 flex-1 items-end justify-between gap-3">
          {bottomLeft()}
          <AddPlaceButton />
        </div>
      )}
    </div>
  )
}
