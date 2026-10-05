# Alenture

A personal map of the cities you've been to. The main screen is a full-bleed map
with markers; all other UI floats on top of it.

Web first, but it will be packaged with Capacitor for iOS and Android. That
constraint shapes the architecture — see "Mobile portability".

## The model

A place is a city. Not a restaurant, a viewpoint or a hotel — those were
categories, and categories are gone: they described what kind of place something
was, and now everything is the same kind of thing.

- The **coordinate** is where you actually stood — a square, a street corner. It
  is deliberately not the city's administrative centroid.
- The **name** is the city.
- Anything about the visit itself goes in the **notes**.

A visit currently means "I was here": zero or one per place, and that limit is
the form's, not the schema's. `visits` is a separate table because a place is
visited many times — the timeline is what will surface them. Do not collapse it
into `places` on the evidence of today's UI.

### Layers, and why they are not categories

A place belongs to at most one **layer**: a grouping the user made and named.
"Towns in Galicia", "Houses", "International". The app has no opinion about what
any of them mean and never offers a starting set.

That is the whole distinction from categories, which were the same shape and
were deleted for it. Categories were *ours* — seven rows a developer chose,
describing what kind of thing a place was, imposed on everybody. A layer is the
user's, and no developer could have anticipated it. Do not read M6 as "grouping
places was a mistake"; read it as "our grouping was".

**Assigned versus derived** is the rule that follows, and it decides where
things live:

- A layer is **assigned**. It costs the user a decision per place. Anything a
  person spent effort on gets a table, survives a reload, and is theirs to
  rename and delete.
- A year and a country are **derived**. They fall out of a date and a
  coordinate, they cost nothing, and every place has whatever it has. They are
  recomputed from the loaded list on every render and stored nowhere.

Both are worth having and both filter the map. Only one of them is worth a
table, and the assigned one leads: it is at the top of the panel, and the
derived filters are a collapsed section below it. A new grouping that fills
itself is a filter; one the user has to fill is a layer.

Deleting a layer never deletes its places. It unassigns them, and every
confirmation has to say so in as many words.

This is the context for the rest of this page. Where something below looks
over-simple, this is usually why.

## Stack

| Package                 | Version     | Note                                                |
| ----------------------- | ----------- | --------------------------------------------------- |
| React                   | 19          |                                                     |
| TypeScript              | 5.8+        | `strict`, `noUncheckedIndexedAccess`                |
| Vite                    | 7           |                                                     |
| Tailwind CSS            | 4           | Tokens in `@theme`, no `tailwind.config.js`         |
| react-map-gl            | 8.1+        | ALWAYS import from `react-map-gl/maplibre`          |
| maplibre-gl             | 5.x         | Do NOT bump to 6 without migrating the worker setup |
| @supabase/supabase-js   | 2.x         |                                                     |
| lucide-react            | 1.33+       | UI icons. Named imports only, so it tree-shakes      |
| i18next / react-i18next | 25.x / 16.x | Plus `i18next-browser-languagedetector`             |

Tiles: OpenFreeMap (`https://tiles.openfreemap.org/styles/liberty`), no API key
required. The style URL lives in an env var, never hardcoded in a component.

Geocoding: Photon (`https://photon.komoot.io/api`), also key-free, also in an
env var. It is a free service with no availability guarantee: the repository
throttles itself to one request per second, and a failed search leaves the map
untouched rather than surfacing as an app error.

Do not add dependencies that aren't in this table without asking first —
especially state management, form or component libraries. None are needed yet.

## Architecture

Organised by feature, not by file type.

```
src/
  app/                    Bootstrap, providers, router
  features/
    map/
      ui/                 MapCanvas, controls, markers
      hooks/              useFlyTo — the one camera move
    places/
      domain/             Types and pure logic. No React, no network.
      data/               PlacesRepository (interface) + implementations
      state/              Context and hooks
      ui/
    search/
      domain/             SearchResult and the query rules
      data/               GeocodingRepository + Photon implementation
      state/
      hooks/              useFlyToResult
      ui/
    layers/               Two things, one panel — see below
      domain/             Layer, the index grouping, the filter predicates
      data/               LayersRepository + implementations
      state/              LayersProvider (records) + MapViewProvider (the lens)
      hooks/
      ui/
    auth/
    trips/                Planned. Does not exist yet.
  shared/
    ui/                   Reusable primitives (Sheet, Panel, Field, PinShape)
    lib/
    i18n/
  types/                  Generated Supabase types. Imported only from data/.
  styles/
```

Empty folders and empty namespace files are placeholders for planned work, not
gaps to fill in passing.

`features/layers/` holds two things that must not be merged, and the names say
which is which. `LayersProvider` and `useLayers()` are the user's layers: records
loaded from a repository, which survive a reload. `MapViewProvider` and
`useMapView()` are the lens — which years, countries and layers are currently
ticked, plus the basemap — which does not. They share a folder because they draw
one panel; they share nothing else.

The derived filters were once called layers too, which is why `FilterGroup`,
`placeFilters.ts` and `useFilterGroups` are named as they are. If you find
"layer" in this feature meaning a year or a country, it is a leftover and it is
wrong.

The map instance is reachable from outside `MapCanvas` through react-map-gl's
`MapProvider`, which `AppProviders` mounts. `MapCanvas` registers itself with
`id={MAIN_MAP_ID}` and anything else calls `useMap()[MAIN_MAP_ID]` — see
`features/search/hooks/useFlyToResult.ts`. Do not pass map refs down through
props or invent a context for it; camera work belongs to whoever is asking for
it, not to `MapCanvas`.

### Non-negotiable rules

1. **`domain/` is plain TypeScript.** No React, no Supabase, no `window`. If a
   domain file needs to import any of those, the logic is in the wrong place.

2. **All data access goes through a repository interface.** Components never call
   `supabase.from(...)` directly. Today there's one implementation backed by
   Supabase; tomorrow there'll be another backed by local SQLite.

3. **Supabase generated types never leave `data/`.** Map them to domain types at
   the boundary. A domain `Place` is not a table row.

4. **No direct `localStorage` or `sessionStorage`.** Go through
   `shared/lib/storage.ts` — this changes under Capacitor.

5. **Every read filters `deleted_at is null`.** Prefer the `places_active` and
   `visits_active` views where they fit.

6. **No `any`.** If a type won't cooperate, say so rather than silencing it.

## Internationalisation

Code, filenames, comments and commit messages: **English**.

The UI goes through i18next from day one. Only the `en` locale exists for now;
Spanish will be added later by copying the structure.

1. **No visible string is written inside a component.** Always `t('key')`. That
   includes `aria-label`, placeholders, error messages and empty states.

2. **One file per namespace**, not a single large JSON:
   `src/shared/i18n/locales/en/{common,map,places,trips,auth,search,layers}.json`
   A feature with its own state and its own failure modes gets its own
   namespace; the list grows with the app rather than capping it.

3. **Keys name meaning, not text.** `places.form.saveButton`, never
   `places.savePlace`. Nested by feature and context.

4. **Plurals always use i18next `_one` / `_other` keys.** Never concatenate a
   number with a string.

5. **Strict typing.** `src/shared/i18n/i18next.d.ts` declares the resources, so a
   missing key is a TypeScript error.

6. **Dates and numbers use `Intl` with the active locale**, never
   `toLocaleDateString()` without an explicit locale.

7. **No display text OF OURS in the database.** Rows carry keys; the UI
   translates them. No lookup table exists today — `place_categories` was the
   last one and milestone 6 dropped it — so this constrains what may be added
   rather than describing something live.

   `layers.name` is not an exception to this and must not be read as one. It is
   the user's own words, in whatever language they wrote them; there is nothing
   to translate and translating it would be vandalism. The rule is about text
   *we* author — a label a developer typed, which has to exist once per locale
   and therefore cannot live in a row. Anything the user typed is data, and data
   is stored as they typed it. The test is "who wrote this string", not "is this
   string displayed".

## Mobile portability

- Relative paths in Vite (`base: './'`), required inside a WebView.
- Heights in `dvh`, never `vh`.
- Respect `env(safe-area-inset-*)` in all floating chrome.
- Minimum touch target 44x44px.
- No interaction may depend on hover alone.
- UUIDs are generated client-side with `crypto.randomUUID()`, never by the
  database, so offline work stays possible later.

## Design

The map is full-bleed at 100% of the viewport. There is never a fixed header,
footer or sidebar cropping it. All chrome floats on top with a semi-transparent
background and `backdrop-blur`.

### Tokens

Defined once in `src/styles/theme.css` using `@theme`:

```css
@theme {
  --color-surface: #250902; /* panel background, used at 85% */
  --color-surface-raised: #38040e;
  --color-border: #640d14;
  --color-text: #fefae0;
  --color-text-muted: #d8c3b5;
  --color-accent: #e9a23b;
  --color-accent-pressed: #bc6c25;
  --color-danger: #e5484d;

  --font-display: "Space Grotesk", sans-serif; /* headings and figures */
  --font-sans: "Inter", sans-serif;

  --radius-panel: 16px;
}
```

**The accent marks the single primary action in whatever context the user is
in.** One per context, never two: if two actions are accented, one of them is
not primary and the question is which.

The map's own accented object is counted separately, and there is one of those
at most too — the pin being placed, or the marker being read. It is not an
action, which is why it may share the screen with one: placing a pin puts the
accent on the pin *and* on the form's save button, and that pair is correct.
Anything beyond those two at once is not.

Today the actions are the add button and the save button in a form or panel, and
the map objects are the placement pin and the selected marker; the selected
navigation item will be an action when there is navigation. Those are examples
of the rule, not the rule itself — a new panel with one obvious primary action
gets the accent for it without amending this file.

What the rule is really against is spraying it around. It is not a highlight, an
emphasis or a brand colour: it is not for focus rings, hover states, headings,
links, badges, counts, or the destructive action in a confirmation — that one is
`danger`, and it is not primary, because the safe answer is.

Figures (counters, dates, coordinates) always use
`font-variant-numeric: tabular-nums`.

### Surface differences

|               | Mobile                             | Desktop                       |
| ------------- | ---------------------------------- | ----------------------------- |
| Layers panel  | Bottom sheet, closed by default    | Bottom-left panel, expanded   |
| Panel + detail | One at a time — both are sheets   | Both at once, opposite corners |
| Forms         | Draggable bottom sheet             | Right side panel, 400px       |
| Zoom          | Gestures only                      | + / − buttons                 |
| Placing a pin | Pin fixed at centre, map moves     | Click to place, pin draggable |
| Moving a saved pin | Sheet steps aside, pin dragged | Pin dragged, panel stays      |

Both surfaces share the same fields in the same order — city, layer, date,
notes, then read-only coordinates. If they diverge, they become two forms to
maintain. The layer sits second because of what the order says: what this place
is, then when you were there and what happened. Name and layer are facts about
the place; date and notes are about the visit.

The layers panel is an index, not a card. It lists every layer with its places
underneath, so it is sized by the number of LAYERS: rows are collapsed by
default, and the list only scrolls once a layer has been opened. It takes the
height the chrome column has left rather than a fixed cap, and it stays a
floating panel inset from both edges — never a sidebar cropping the map.

Placing and moving differ, and the difference is not arbitrary. A pin being
placed has no position yet, so the map's own movement is the input and a fixed
centre pin is the natural control. A pin being moved already has one, so the
gesture is a drag on both surfaces — recentring the map to reuse the placement
control would throw away the user's view of where the pin currently is, which is
the only thing they can judge the move against. What the coarse surface has to
solve is the sheet covering the map, and it solves that by getting out of the
way, not by changing the gesture.

### Markers

One shape, drawn once in `shared/ui/PinShape.tsx`: a 32px disc on a tail, as a
single path. Every pin on the map renders it, because placement is a promise
about what the marker will be. What differs is state, never shape:

|                             | Fill             | Stroke             |
| --------------------------- | ---------------- | ------------------ |
| At rest                     | `surface` at 85% | `text` at 25%, 1px |
| The one the screen is about | `accent`, opaque | `surface`, 2px     |

Two states, not one per flow. Being placed, being read in the detail panel and
being dragged to a new position are all the same claim — this is the pin this
screen is currently about — and a pin that looked different in each would be
saying they were different things.

The accented one is opaque where the resting pin is translucent: it should read
as definite, and translucency over a moving map reads as tentative.

The tip is the coordinate, not the centre. Map markers are anchored `bottom`;
`CenterPin` is fixed to the viewport instead and offsets by half its own height.
The SVG is `display: block` for a reason given at the source — inlining it makes
the element's box taller than the drawing and silently shifts the point.

All markers render identically. Population will size them once geocoding lands.

## Database

Supabase with PostGIS. The schema is applied; the three files in
`supabase/migrations/` are its history. The first two still mention
`place_categories` and `places.category`, which the third drops — read them in
order, not individually.

- `places` — a city. Read `lat`/`lng`; `geom` is **generated**, so use it for
  spatial queries and never write it — Postgres rejects any insert or update
  naming it, whatever the generated types claim. `population` is nullable and
  unused for now; it is what will size the markers once geocoding lands.
- `visits` — N per place. A visit is a `date`, not a `timestamptz`. `rating`
  exists and nothing writes it; the timeline will. Don't drop it to re-add it.
- `layers` — the user's own grouping, referenced by `places.layer_id` through a
  composite `(layer_id, user_id)` FK. `sort` is the panel's order; it is not
  unique, because reordering swaps two values and the swap's middle state would
  otherwise be illegal. Ties break by `created_at`.
- `trips` — group visits together. Not layers: a trip groups visits, a layer
  groups places.

All tables have RLS enabled with an owner policy. `user_id` defaults to
`auth.uid()`, so **the client never sends it**.

The foreign keys on `visits` and on `places.layer_id` are composite
`(place_id, user_id)` and `(layer_id, user_id)`, which makes it impossible to
attach a visit to another user's place or file a place under another user's
layer.

`public.delete_layer(uuid)` is the one delete that is a function, and the
migration that creates it carries the reason at the source. In short: soft-
deleting a layer and unassigning its places are two writes, PostgREST cannot
wrap two writes in a transaction, and the half-completed version throws away the
user's assignments while reporting that nothing happened. Do not split it back
into two client calls.

`changes_since` lists every table. A table missing from it is invisible to
incremental sync, silently — add new tables there in the same migration that
creates them.

Regenerate types (PowerShell):

```powershell
npx supabase gen types typescript --linked | Out-File -Encoding utf8 src/types/database.ts
```

Not `>`. PowerShell's redirection writes UTF-16, and the file then reads as
binary to grep, ripgrep, `git diff` and GitHub review — the content is correct
and every tool that inspects it says otherwise.

## Working in this repo

- Small, reviewable changes. Before writing code that spans several files,
  propose the plan and wait for confirmation.
- When a rule in this file changes, grep `src/` for the old wording before
  calling it done. Comments that quote the rules are part of this document, and
  they are the copy people actually read — nobody opens CLAUDE.md to check a
  comment that already sounds authoritative. A rule deleted here and left
  standing in three files has not been changed; it has been forked, and the
  fork is the one at the point of use. The accent rule is the case that set
  this: it was reworded here while `PlacementPin` and `PlaceMarker` went on
  citing "the exactly three uses" of a version that no longer existed.
- Configuration lives in `.env`, not `.env.local`. Vite loads both and merges
  them, so a variable put in the wrong file works — and the next person to go
  looking finds the file it should have been in and concludes it was never set.
  `.env.example` is the checked-in template; both real files are git-ignored.
- A variable that can disagree with another one is required and has no default.
  `shared/lib/env.ts` names those, and a missing one stops the app at startup
  rather than once per use. The two geocoding endpoints are the case that set
  the rule: default either of them and a setup that points one at a self-hosted
  Photon keeps talking to the public instance with the other, which looks
  exactly like the geocoder having nothing to say. `VITE_MAP_STYLE_URL` is the
  remaining default, and defensibly so — it has no partner to fall out of step
  with, and a style that fails to load is a blank map, which nobody mistakes for
  a working one.
- Don't create a README, tests or CI unless asked.
- Schema changes go through a migration and `supabase db push`. Never the SQL
  Editor: it leaves the schema right and the migration history wrong, and the
  two then disagree silently.
- A green `tsc` says nothing about whether `src/types/database.ts` matches the
  database. An added column is optional on `Insert`, and a removed one breaks
  nothing if no code reads it, so a stale file passes in silence. After any
  migration, grep the file on disk for the column that changed — the file, not
  the CLI's output.
