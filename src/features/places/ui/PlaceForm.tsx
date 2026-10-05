import type { ReactNode } from 'react'
import type { TFunction } from 'i18next'
import { useTranslation } from 'react-i18next'

import type { Layer } from '@/features/layers/domain/Layer'
import { LayerPicker } from '@/features/layers/ui/LayerPicker'
import { formatCoordinate } from '@/features/places/domain/coordinates'
import { formatCountryName } from '@/features/places/domain/countryName'
import { parseDateOnly } from '@/features/places/domain/dateOnly'
import type { PlaceDraft, PlaceDraftErrors } from '@/features/places/domain/placeDraft'
import {
  MAX_NAME_LENGTH,
  MAX_NOTES_LENGTH,
  textLength,
} from '@/features/places/domain/textLimits'
import type { PlacementDetection } from '@/features/places/state/placementContext'
import type { ReverseResult } from '@/features/search/domain/ReverseResult'
import { Field, Fieldset } from '@/shared/ui/Field'

/**
 * What both modes need.
 *
 * Filling one in and reading one back otherwise carry different props, because
 * they need different things: there is nothing to change in a record, and
 * nothing to detect about a place saved months ago.
 *
 * The layers are here rather than read from a provider inside `LayerPicker`
 * because this component takes values and gives back changes, and nothing else
 * in it knows what a context is. Read mode needs them too: `draft.layerId` is
 * an id, and an id is not something to show a person.
 */
interface CommonProps {
  draft: PlaceDraft
  layers: readonly Layer[]
}

interface EditProps extends CommonProps {
  mode: 'edit'
  errors: PlaceDraftErrors
  disabled: boolean
  /**
   * What the geocoder said about the pin. Shown, never silently applied here.
   *
   * Optional because the detail panel edits a place that was saved long ago:
   * there is no pin being placed and nothing being looked up, and the hint line
   * simply does not appear. An idle detection passed in to say so would be a
   * placement flow that isn't happening, described in a prop.
   */
  detection?: PlacementDetection | undefined
  /**
   * An offer to rename, when the pin has been dragged somewhere the geocoder
   * calls something else. Absent in the add flow, where the name is prefilled
   * from the pin rather than argued with.
   *
   * An offer, never an application: the name is the user's, and the only thing
   * this does on its own is appear.
   */
  suggestion?: NameSuggestion | undefined
  onChange(patch: Partial<PlaceDraft>): void
}

export interface NameSuggestion {
  /** The city the geocoder says is under the pin now. */
  name: string
  onAccept(): void
  onDismiss(): void
}

interface ReadProps extends CommonProps {
  mode: 'read'
}

type PlaceFormProps = EditProps | ReadProps

const INPUT_CLASS =
  'min-h-11 w-full rounded-xl border border-border/60 bg-surface-raised/60 px-3 text-sm text-text placeholder:text-text-muted/70 focus:border-text/40 focus:outline-none disabled:opacity-50'

/**
 * Name, layer, date, notes, coordinates — in that order, on both surfaces and
 * in both modes. The layer goes second because of what the order is saying:
 * what this place is, then when you were there and what happened. It is a fact
 * about the place, like the name; the date and the notes are about the visit. The container decides whether this sits in a panel or a sheet; the
 * fields and their order are not the container's business, which is what keeps
 * the two surfaces from drifting into two forms.
 *
 * Reading is that same list with the controls replaced by their values, rather
 * than a second component: a field added for the add flow shows up in the
 * detail panel because it is literally the same list, not because someone
 * remembered to add it twice.
 *
 * Read mode renders text, not disabled inputs. A greyed-out control says "you
 * may not do this"; what is meant is "this is a record". The detail panel
 * switches this component between the two modes in place, so the way to edit a
 * record is the record's own fields becoming editable — which is what a
 * disabled input would have made harder to arrive at, not easier.
 */
export function PlaceForm(props: PlaceFormProps) {
  const { t, i18n } = useTranslation('places')
  const { draft, layers } = props

  // Null both when the place is unfiled and when its layer has been deleted
  // out from under it — the same answer, and the true one either way: the
  // database says unassigned in both cases.
  const layerName = layers.find((layer) => layer.id === draft.layerId)?.name ?? null

  const coordinates = (
    <p className="font-display text-sm text-text-muted tabular-nums">
      {formatCoordinate(draft.coordinates.lat, i18n.language)}
      {', '}
      {formatCoordinate(draft.coordinates.lng, i18n.language)}
    </p>
  )

  if (props.mode === 'read') {
    const country = draft.countryCode
      ? formatCountryName(draft.countryCode, i18n.language)
      : null

    return (
      <div className="flex flex-col gap-4">
        {/*
          The country sits under the name, where the detection hint sits while
          the form is being filled in — the same line, saying the same kind of
          thing, from the same formatter. Absent when there is no code or `Intl`
          does not know it: a place with no country is still a place, and a
          label over nothing is worse than no label.
        */}
        <Fieldset label={t('form.name.label')} hint={country ?? undefined}>
          <ReadValue>{draft.name}</ReadValue>
        </Fieldset>

        <Fieldset label={t('form.layer.label')}>
          {layerName === null ? (
            <ReadValue muted>{t('form.layer.none')}</ReadValue>
          ) : (
            <ReadValue>{layerName}</ReadValue>
          )}
        </Fieldset>

        <Fieldset label={t('form.date.label')}>
          {draft.startedOn === '' ? (
            /*
              Its own sentence, not an empty gap. "Been here, don't remember
              when" is something the user said, and the panel says it back
              rather than looking like it lost the date.
            */
            <ReadValue muted>{t('detail.date.unknown')}</ReadValue>
          ) : (
            <ReadValue className="tabular-nums">
              {formatVisitDate(draft.startedOn, i18n.language)}
            </ReadValue>
          )}
        </Fieldset>

        <Fieldset label={t('form.notes.label')}>
          {draft.notes === '' ? (
            <ReadValue muted>{t('detail.notes.empty')}</ReadValue>
          ) : (
            // `whitespace-pre-line`, so the line breaks someone typed survive
            // being read back.
            <ReadValue className="whitespace-pre-line">{draft.notes}</ReadValue>
          )}
        </Fieldset>

        <Fieldset label={t('form.coordinates.label')}>{coordinates}</Fieldset>
      </div>
    )
  }

  const { errors, disabled, detection, suggestion, onChange } = props

  return (
    <div className="flex flex-col gap-4">
      {/*
        The hint says where the name came from, so overwriting it feels expected
        rather than like correcting the app. It stays after the field is edited:
        what was detected is still true, and it is the user's evidence that they
        have changed it. `Field` drops it while there is an error to show.
      */}
      <Field
        label={t('form.name.label')}
        error={errors.name && t(errors.name)}
        hint={detectionHint(detection, t, i18n.language)}
      >
        {({ id, describedBy }) => (
          <input
            id={id}
            aria-describedby={describedBy}
            type="text"
            value={draft.name}
            disabled={disabled}
            maxLength={MAX_NAME_LENGTH}
            placeholder={t('form.name.placeholder')}
            onChange={(event) => onChange({ name: event.target.value })}
            className={INPUT_CLASS}
          />
        )}
      </Field>

      {/*
        Directly under the name it is about, and only ever offered. `role="status"`
        rather than `alert`: it appears because a pin came to rest, not because
        anything went wrong, and it must not interrupt what is being typed.
      */}
      {suggestion && (
        <div
          role="status"
          className="flex flex-col gap-2 rounded-xl border border-border/60 bg-surface-raised/60 p-3"
        >
          <p className="text-xs text-text-muted">
            {t('form.name.suggestion', { place: suggestion.name })}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={suggestion.onAccept}
              disabled={disabled}
              className="min-h-11 flex-1 rounded-full border border-border/60 px-4 text-sm text-text disabled:opacity-50"
            >
              {t('form.name.suggestionAccept')}
            </button>
            <button
              type="button"
              onClick={suggestion.onDismiss}
              disabled={disabled}
              className="min-h-11 flex-1 rounded-full px-4 text-sm text-text-muted transition-colors hover:text-text disabled:opacity-50"
            >
              {t('form.name.suggestionDismiss')}
            </button>
          </div>
        </div>
      )}

      {/*
        After the city and before the date, which is where it belongs in the
        sentence the form is making: what this place IS, then when you were
        there. A `Fieldset` rather than a `Field` — there is no single input for
        a `<label>` to point at.
      */}
      <Fieldset label={t('form.layer.label')} hint={t('form.layer.hint')}>
        <LayerPicker
          layers={layers}
          selectedId={draft.layerId}
          disabled={disabled}
          onSelect={(layerId) => onChange({ layerId })}
        />
      </Fieldset>

      <Field
        label={t('form.date.label')}
        error={errors.startedOn && t(errors.startedOn)}
        hint={t('form.date.hint')}
      >
        {({ id, describedBy }) => (
          <input
            id={id}
            aria-describedby={describedBy}
            type="date"
            value={draft.startedOn}
            disabled={disabled}
            onChange={(event) => onChange({ startedOn: event.target.value })}
            className={`${INPUT_CLASS} tabular-nums`}
          />
        )}
      </Field>

      {/*
        The counter is a hint, so it sits where every other hint sits and an
        error takes its place rather than stacking under it.
      */}
      <Field
        label={t('form.notes.label')}
        error={errors.notes && t(errors.notes)}
        hint={notesCounter(draft.notes, t, i18n.language)}
      >
        {({ id, describedBy }) => (
          <textarea
            id={id}
            aria-describedby={describedBy}
            rows={3}
            value={draft.notes}
            disabled={disabled}
            maxLength={MAX_NOTES_LENGTH}
            placeholder={t('form.notes.placeholder')}
            onChange={(event) => onChange({ notes: event.target.value })}
            className={`${INPUT_CLASS} resize-none py-2`}
          />
        )}
      </Field>

      {/*
        Read-only. The pin is how coordinates are changed, and it stays draggable
        behind the form — these figures move as it does.
      */}
      <Fieldset label={t('form.coordinates.label')} error={errors.coordinates && t(errors.coordinates)}>
        {coordinates}
      </Fieldset>
    </div>
  )
}

/**
 * "1 720 / 2000", once the notes are nearly full, and nothing before that.
 *
 * A counter sitting under an empty field reads as a demand for brevity, which
 * is the opposite of the intent — notes should feel roomy. It appears at 80% of
 * the limit, which is late enough to be news and early enough to act on.
 */
const COUNTER_THRESHOLD = 0.8

function notesCounter(
  notes: string,
  t: TFunction<'places'>,
  locale: string,
): string | undefined {
  // The trimmed length, because that is the one being measured against the
  // limit — a counter that disagrees with the error is worse than none.
  const length = textLength(notes)
  if (length < MAX_NOTES_LENGTH * COUNTER_THRESHOLD) {
    return undefined
  }
  const format = new Intl.NumberFormat(locale)
  return t('form.notes.counter', {
    length: format.format(length),
    max: format.format(MAX_NOTES_LENGTH),
  })
}

/**
 * One value as the panel reads it. Every read-mode field goes through this, so
 * a placeholder line and a real one cannot drift apart in anything but the one
 * thing that distinguishes them.
 */
function ReadValue({
  children,
  muted = false,
  className = '',
}: {
  children: ReactNode
  muted?: boolean
  className?: string
}) {
  return (
    <p className={`text-sm ${muted ? 'italic text-text-muted' : 'text-text'} ${className}`}>
      {children}
    </p>
  )
}

/**
 * A `YYYY-MM-DD` as a date in the reader's language.
 *
 * Through `Intl` with the active locale, never a bare `toLocaleDateString()`,
 * and parsed at local midnight: the string is a calendar day, and
 * `new Date('2026-08-20')` is UTC by spec, which renders as the 19th west of
 * Greenwich.
 */
function formatVisitDate(startedOn: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: 'long' }).format(parseDateOnly(startedOn))
}

/**
 * "Detected: Salamanca, Spain", or the loading line, or nothing at all.
 *
 * Nothing is the answer for an absent detection, for 'idle' and for an empty
 * result: a lookup that
 * found nothing and one that failed are the same non-event to the person
 * filling the form in, and neither is worth a line of chrome.
 */
function detectionHint(
  detection: PlacementDetection | undefined,
  t: TFunction<'places'>,
  locale: string,
): string | undefined {
  if (!detection) {
    return undefined
  }
  if (detection.status === 'detecting') {
    return t('form.name.detecting')
  }
  if (!detection.result) {
    return undefined
  }
  return t('form.name.detected', { place: formatDetectedPlace(detection.result, locale) })
}

/** The settlement and its country on one line. */
function formatDetectedPlace(result: ReverseResult, locale: string): string {
  if (!result.countryCode) {
    return result.name
  }
  const country = formatCountryName(result.countryCode, locale)
  // No name back means a code `Intl` does not know. Printing "Salamanca, ES"
  // beside a name would read as a data glitch; the name alone does not.
  return country ? `${result.name}, ${country}` : result.name
}
