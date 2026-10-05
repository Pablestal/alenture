-- =============================================================
-- Alenture — esquema inicial
-- Requisito previo: extensión postgis ya instalada.
-- Ejecutar de una sola vez, de arriba abajo.
-- =============================================================

set search_path = public, extensions;

-- -------------------------------------------------------------
-- 1. Utilidades
-- -------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;


-- -------------------------------------------------------------
-- 2. Categorías (catálogo compartido)
-- -------------------------------------------------------------

create table public.place_categories (
  key   text primary key,
  label text not null,
  icon  text,
  sort  smallint not null default 0
);

insert into public.place_categories (key, label, sort) values
  ('ciudad',      'Ciudad',      1),
  ('naturaleza',  'Naturaleza',  2),
  ('playa',       'Playa',       3),
  ('cultura',     'Cultura',     4),
  ('comida',      'Comida',      5),
  ('alojamiento', 'Alojamiento', 6),
  ('otro',        'Otro',       99);


-- -------------------------------------------------------------
-- 3. Viajes
-- -------------------------------------------------------------

create table public.trips (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid()
               references auth.users(id) on delete cascade,

  name       text not null check (char_length(trim(name)) between 1 and 200),
  started_on date,
  ended_on   date,
  notes      text,
  color      text check (color is null or color ~ '^#[0-9a-fA-F]{6}$'),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,

  constraint trips_dates_ok
    check (ended_on is null or started_on is null or ended_on >= started_on),

  -- Necesario para que visits pueda referenciar (id, user_id) y así
  -- garantizar a nivel de BD que un viaje y su visita son del mismo usuario.
  constraint trips_id_user_key unique (id, user_id)
);

create index trips_user_idx
  on public.trips (user_id, started_on desc)
  where deleted_at is null;

create trigger trips_updated_at
  before update on public.trips
  for each row execute function public.set_updated_at();


-- -------------------------------------------------------------
-- 4. Lugares
-- -------------------------------------------------------------

create table public.places (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid()
                 references auth.users(id) on delete cascade,

  name         text not null check (char_length(trim(name)) between 1 and 200),

  lat          double precision not null check (lat between -90 and 90),
  lng          double precision not null check (lng between -180 and 180),
  -- Columna generada: siempre coherente con lat/lng, nunca se desincroniza.
  -- Lee lat/lng desde el cliente; usa geom para consultas espaciales.
  geom         geography(Point, 4326) generated always as (
                 st_setsrid(st_makepoint(lng, lat), 4326)::geography
               ) stored,

  category     text not null default 'otro'
                 references public.place_categories(key),
  country_code char(2) check (country_code is null or country_code ~ '^[A-Z]{2}$'),
  address      text,
  notes        text,

  source       text not null default 'manual'
                 check (source in ('manual', 'search', 'import')),
  source_ref   text,

  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  deleted_at   timestamptz,

  constraint places_id_user_key unique (id, user_id)
);

-- Evita duplicados al reimportar el mismo origen dos veces.
create unique index places_source_ref_key
  on public.places (user_id, source, source_ref)
  where source_ref is not null;

create index places_geom_idx on public.places using gist (geom);

create index places_user_idx
  on public.places (user_id)
  where deleted_at is null;

create index places_category_idx
  on public.places (user_id, category)
  where deleted_at is null;

create trigger places_updated_at
  before update on public.places
  for each row execute function public.set_updated_at();


-- -------------------------------------------------------------
-- 5. Visitas
-- -------------------------------------------------------------

create table public.visits (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid()
               references auth.users(id) on delete cascade,
  place_id   uuid not null,
  trip_id    uuid,

  -- date, no timestamptz: una visita es un día, no un instante con zona horaria.
  started_on date not null,
  ended_on   date,
  rating     smallint check (rating between 1 and 5),
  notes      text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,

  constraint visits_dates_ok
    check (ended_on is null or ended_on >= started_on),

  -- FK compuestas: impiden colgar una visita de un lugar o viaje de otro usuario.
  constraint visits_place_fk
    foreign key (place_id, user_id)
    references public.places (id, user_id)
    on delete cascade,

  -- Requiere PostgreSQL 15+ (lista de columnas en SET NULL).
  constraint visits_trip_fk
    foreign key (trip_id, user_id)
    references public.trips (id, user_id)
    on delete set null (trip_id)
);

create index visits_place_idx
  on public.visits (place_id)
  where deleted_at is null;

create index visits_trip_idx
  on public.visits (trip_id)
  where trip_id is not null and deleted_at is null;

create index visits_date_idx
  on public.visits (user_id, started_on desc)
  where deleted_at is null;

create trigger visits_updated_at
  before update on public.visits
  for each row execute function public.set_updated_at();


-- -------------------------------------------------------------
-- 6. Row Level Security
--
-- Sin esto las tablas son públicas para cualquiera con la anon key.
-- El (select auth.uid()) envuelto en subconsulta se evalúa una sola vez
-- en lugar de fila a fila: cambia mucho el plan de ejecución.
-- -------------------------------------------------------------

alter table public.places            enable row level security;
alter table public.visits            enable row level security;
alter table public.trips             enable row level security;
alter table public.place_categories  enable row level security;

create policy "places_owner" on public.places
  for all to authenticated
  using      ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "visits_owner" on public.visits
  for all to authenticated
  using      ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "trips_owner" on public.trips
  for all to authenticated
  using      ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "categories_read" on public.place_categories
  for select to authenticated
  using (true);


-- -------------------------------------------------------------
-- 7. Vistas de lectura
--
-- security_invoker = on es obligatorio: sin él la vista se ejecuta con
-- los permisos del propietario y salta el RLS de las tablas base.
-- -------------------------------------------------------------

-- Lo que consume el mapa: un marcador por lugar, con su resumen de visitas.
create view public.places_active
with (security_invoker = on) as
select
  p.id,
  p.name,
  p.lat,
  p.lng,
  p.category,
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

-- Timeline cronológico.
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
  p.category,
  p.country_code,
  t.name         as trip_name,
  t.color        as trip_color
from public.visits v
join public.places p on p.id = v.place_id
left join public.trips t on t.id = v.trip_id
where v.deleted_at is null
  and p.deleted_at is null;


-- -------------------------------------------------------------
-- 8. Sincronización incremental (para el offline futuro)
--
-- Devuelve todo lo cambiado desde una marca de tiempo, incluidas las
-- filas borradas. Un DELETE físico sería invisible para el otro
-- dispositivo y la fila reaparecería; por eso el borrado es lógico.
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
  from public.trips t where t.updated_at > since;
$$;


-- =============================================================
-- Comprobaciones
-- =============================================================

-- Todas las tablas deben salir con rowsecurity = true
--   select tablename, rowsecurity from pg_tables
--   where schemaname = 'public' order by tablename;

-- Las políticas creadas
--   select tablename, policyname, roles, cmd from pg_policies
--   where schemaname = 'public' order by tablename;

-- Prueba de humo (ejecutar autenticado, no con la service_role key):
--   insert into public.places (name, lat, lng, category)
--   values ('A Coruña', 43.3623, -8.4115, 'ciudad');
--
--   insert into public.visits (place_id, started_on)
--   select id, current_date from public.places where name = 'A Coruña';
--
--   select * from public.places_active;
