-- -------------------------------------------------------------
-- A ceiling on places.notes.
--
-- The column has been unbounded since the initial schema, which is a
-- row of arbitrary size behind an RLS policy and no way to say no.
--
-- 5000, not the 2000 the form enforces, and the gap is deliberate: the
-- form is the real limit, and this is the backstop. A check that
-- matched the form would fire on the ordinary path the moment either
-- number moved, and the message the user got would be a Postgres error
-- instead of the one under the field. This only fires if something
-- bypassed the UI entirely.
--
-- `notes is null or ...` because a place with nothing written down is a
-- place, and an unconstrained null would fail the check rather than
-- skip it — Postgres treats a null check result as satisfied, so the
-- clause is for the reader as much as for the planner.
--
-- Not trimmed, unlike the name's `char_length(trim(name))`. The name is
-- trimmed there because a name of spaces is an empty name; here the
-- question is only how much text a row may hold, and whitespace is
-- text the database has to store.
--
-- No `not valid` / `validate constraint` dance: nothing has ever
-- written notes near this length, so the table scan is a scan of rows
-- that all pass.
-- -------------------------------------------------------------

alter table public.places
  add constraint places_notes_length
  check (notes is null or char_length(notes) <= 5000);

-- Verify:
--   select conname, pg_get_constraintdef(oid)
--   from pg_constraint where conrelid = 'public.places'::regclass;
