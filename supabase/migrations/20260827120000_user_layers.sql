-- -------------------------------------------------------------
-- User-defined layers.
--
-- Categories were our taxonomy imposed on the user's places: a
-- fixed list a developer wrote, describing what kind of place
-- something was. Milestone 6 dropped them. This is the opposite
-- shape and it is why the two can coexist in one history without
-- contradicting each other: a layer is the user's own scheme,
-- named by them, meaning whatever they need it to mean. "Towns in
-- Galicia", "Houses", "International" — no developer could have
-- anticipated any of those, which is the entire point.
--
-- Layers are ASSIGNED. They cost the user effort per place, which
-- is what distinguishes them from the year and country filters the
-- app already has: those are derived and fill themselves. Both are
-- worth having; only one of them is worth a table.
--
-- No colour column. It is coming, with the redesign of how
-- selection is marked, and adding it now would mean a nullable
-- column nothing writes and a marker rule that has not been
-- decided yet.
--
-- Wrapped in a transaction: places_active has to be dropped and
-- recreated to expose the new column, and a failure partway
-- through must not leave the schema without it.
-- -------------------------------------------------------------

begin;

-- -------------------------------------------------------------
-- 1. The table
-- -------------------------------------------------------------

create table public.layers (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid()
               references auth.users(id) on delete cascade,

  -- Same bounds as trips.name and places.name, trimmed for the
  -- same reason: a name of spaces is an empty name. Shorter than
  -- those two at 100 — a layer name is a label on a panel row, not
  -- prose, and the row it has to fit in is 320px wide.
  name       text not null check (char_length(trim(name)) between 1 and 100),

  -- The order the panel lists them in. Not unique, and deliberately
  -- not: reordering swaps two values, and a unique constraint would
  -- make the intermediate state of that swap illegal. Ties are
  -- broken by created_at when they happen, so a failed swap leaves
  -- an order that is wrong rather than one that is unstable.
  sort       integer not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,

  -- Lets places reference (id, user_id), which is what makes it
  -- impossible to file your place under another user's layer.
  -- Same device as trips_id_user_key and places_id_user_key.
  constraint layers_id_user_key unique (id, user_id)
);

create index layers_user_idx
  on public.layers (user_id, sort)
  where deleted_at is null;

create trigger layers_updated_at
  before update on public.layers
  for each row execute function public.set_updated_at();

alter table public.layers enable row level security;

-- The (select auth.uid()) subquery is evaluated once rather than
-- per row, exactly as in the policies it is copied from.
create policy "layers_owner" on public.layers
  for all to authenticated
  using      ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);


-- -------------------------------------------------------------
-- 2. The assignment
--
-- One layer per place for now. Going one-to-many later is
-- additive — a join table, and this column read as its seed — so
-- the cheap thing is also the reversible one.
-- -------------------------------------------------------------

alter table public.places
  add column layer_id uuid,
  add constraint places_layer_fk
    foreign key (layer_id, user_id)
    references public.layers (id, user_id)
    -- Requires PostgreSQL 15+ for the column list, same as
    -- visits_trip_fk. This covers a HARD delete only; the app's
    -- delete is logical, which is what delete_layer() below is for.
    on delete set null (layer_id);

comment on column public.places.layer_id is
  'The user''s own layer this place is filed under, or null for unassigned.';

-- The shape the dropped places_category_idx had, for the same
-- query: every place in one layer, for one user.
create index places_layer_idx
  on public.places (user_id, layer_id)
  where deleted_at is null;


-- -------------------------------------------------------------
-- 3. Deleting a layer
--
-- This is a function and the other deletes are not, and a reader
-- finding it here is owed the reason.
--
-- Deleting a layer must not delete its places — it unassigns them.
-- Every delete in this app is logical, and a logical delete is an
-- update, so the `on delete set null` above never fires: the layer
-- row still exists, and places go on pointing at it. Two writes are
-- therefore needed, and PostgREST cannot wrap two writes in a
-- transaction.
--
-- Split across two calls from the client, the failure mode is the
-- worst one available and also the likely one: the places are
-- unassigned, the layer delete fails, and the user is told the
-- delete did not happen while their assignments have already been
-- thrown away. There is no ordering of the two calls that avoids
-- it — the other order strands live places on a layer the panel no
-- longer lists.
--
-- security invoker, so RLS still decides which rows are visible:
-- this function grants nothing. It cannot touch another user's
-- layer or another user's places, and neither predicate below has
-- to say so. search_path is empty, so every name is qualified.
-- -------------------------------------------------------------

create or replace function public.delete_layer(p_layer_id uuid)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  deleted_layer uuid;
begin
  update public.layers
     set deleted_at = now()
   where id = p_layer_id
     and deleted_at is null
  returning id into deleted_layer;

  -- Nothing was deleted: the layer is already gone, or it is not
  -- ours and RLS hid it. Either way its places are not ours to
  -- unassign, so this returns before touching them.
  if deleted_layer is null then
    return false;
  end if;

  -- Live places only. A deleted place's layer_id is read by
  -- nothing, and updating it would move updated_at on rows that
  -- are already tombstones and re-emit them from changes_since.
  update public.places
     set layer_id = null
   where layer_id = p_layer_id
     and deleted_at is null;

  return true;
end;
$$;

comment on function public.delete_layer(uuid) is
  'Soft-deletes a layer and unassigns its places, atomically. Returns false when there was no live layer to delete. A function rather than two client calls because a partial failure would discard the user''s assignments while reporting that the delete failed.';


-- -------------------------------------------------------------
-- 4. The read view
--
-- Dropped and recreated rather than `create or replace`d: that
-- form can only append columns at the end, which would file
-- layer_id after last_visit, away from the place columns it
-- belongs with. visits_active does not select it and is left
-- alone.
--
-- security_invoker stays on. Without it the view runs as its owner
-- and bypasses the RLS of the tables underneath.
-- -------------------------------------------------------------

drop view public.places_active;

create view public.places_active
with (security_invoker = on) as
select
  p.id,
  p.name,
  p.lat,
  p.lng,
  p.layer_id,
  p.country_code,
  p.address,
  p.notes,
  p.created_at,
  p.updated_at,
  count(v.id)          as visit_count,
  min(v.started_on)    as first_visit,
  max(v.started_on)    as last_visit
from public.places p
left join public.visits v
  on v.place_id = p.id
 and v.deleted_at is null
where p.deleted_at is null
group by p.id;


-- -------------------------------------------------------------
-- 5. Incremental sync
--
-- Three lines, added now rather than with the sync work. A table
-- missing from here is invisible to another device: the layer is
-- never sent, the places arrive filed under an id that resolves to
-- nothing, and the symptom is an organising scheme that silently
-- fails to cross between devices.
--
-- The return type is unchanged, which is what lets this be a
-- replace rather than a drop.
-- -------------------------------------------------------------

create or replace function public.changes_since(since timestamptz)
returns table (
  entity     text,
  id         uuid,
  updated_at timestamptz,
  deleted    boolean
)
language sql
stable
security invoker
set search_path = ''
as $$
  select 'place', p.id, p.updated_at, p.deleted_at is not null
  from public.places p where p.updated_at > since
  union all
  select 'visit', v.id, v.updated_at, v.deleted_at is not null
  from public.visits v where v.updated_at > since
  union all
  select 'trip', t.id, t.updated_at, t.deleted_at is not null
  from public.trips t where t.updated_at > since
  union all
  select 'layer', l.id, l.updated_at, l.deleted_at is not null
  from public.layers l where l.updated_at > since;
$$;

commit;

-- Verify:
--   select column_name from information_schema.columns
--   where table_name = 'places_active' order by ordinal_position;
--
--   select conname, pg_get_constraintdef(oid)
--   from pg_constraint where conrelid = 'public.places'::regclass;
--
--   select tablename, policyname, cmd from pg_policies
--   where schemaname = 'public' and tablename = 'layers';
