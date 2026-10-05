-- -------------------------------------------------------------
-- A place is a city.
--
-- Categories described what kind of place something was: a city, a
-- beach, a restaurant, somewhere to sleep. That distinction no longer
-- exists. Every place in Alenture is a city you have been to; the
-- coordinate is where you actually stood — a square, a street — not the
-- administrative centroid, and anything about the stay itself belongs
-- in the notes. A column whose every row would read 'city' is not a
-- fact about the data, so it goes.
--
-- `population` arrives in the same migration. It is unused today, but
-- it is what will size the markers once geocoding lands, and adding a
-- nullable column now is cheaper than a second migration then.
--
-- `visits.rating` is deliberately left in place. Also unused by the UI,
-- but the timeline will likely want it, and dropping a column to
-- re-add it later is worse than carrying an idle one.
--
-- Wrapped in a transaction: the views have to be dropped before the
-- column can be, and a failure partway through must not leave the
-- schema without them.
-- -------------------------------------------------------------

begin;

-- Both views select places.category, so both block the drop.
drop view public.visits_active;
drop view public.places_active;

drop index public.places_category_idx;

alter table public.places
  drop constraint places_category_fkey,
  drop column category;

drop table public.place_categories;

alter table public.places
  add column population integer
    constraint places_population_non_negative check (population is null or population >= 0);

comment on column public.places.population is
  'Inhabitants of the city, when known. Unused for now; will size the marker.';

-- Recreated unchanged apart from the missing column. security_invoker
-- stays on: without it the view runs as its owner and bypasses the RLS
-- of the tables underneath.
create view public.places_active
with (security_invoker = on) as
select
  p.id,
  p.name,
  p.lat,
  p.lng,
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

create view public.visits_active
with (security_invoker = on) as
select
  v.id,
  v.place_id,
  v.trip_id,
  v.started_on,
  v.ended_on,
  v.rating,
  v.notes,
  p.name         as place_name,
  p.lat,
  p.lng,
  p.country_code,
  t.name         as trip_name,
  t.color        as trip_color
from public.visits v
join public.places p on p.id = v.place_id
left join public.trips t on t.id = v.trip_id
where v.deleted_at is null
  and p.deleted_at is null;

commit;
