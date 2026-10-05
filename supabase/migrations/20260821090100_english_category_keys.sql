-- =============================================================
-- Rename place_categories keys from Spanish to English.
--
-- The keys are identifiers, not display text: the UI translates
-- them via i18n (categories.city, categories.nature, ...).
-- Having them in Spanish clashed with an English codebase.
--
-- The FK from places.category has to be dropped and recreated,
-- since the referenced values change.
-- =============================================================

begin;

alter table public.places
  drop constraint places_category_fkey;

update public.place_categories set key = 'city'          where key = 'ciudad';
update public.place_categories set key = 'nature'        where key = 'naturaleza';
update public.place_categories set key = 'beach'         where key = 'playa';
update public.place_categories set key = 'culture'       where key = 'cultura';
update public.place_categories set key = 'food'          where key = 'comida';
update public.place_categories set key = 'accommodation' where key = 'alojamiento';
update public.place_categories set key = 'other'         where key = 'otro';

update public.places set category = case category
  when 'ciudad'      then 'city'
  when 'naturaleza'  then 'nature'
  when 'playa'       then 'beach'
  when 'cultura'     then 'culture'
  when 'comida'      then 'food'
  when 'alojamiento' then 'accommodation'
  else 'other'
end;

alter table public.places
  alter column category set default 'other',
  add constraint places_category_fkey
    foreign key (category) references public.place_categories(key);

commit;

-- The label column is a reference for humans reading the table.
-- It is never rendered: the UI translates from key.
alter table public.place_categories rename column label to label_ref;

comment on column public.place_categories.label_ref is
  'Reference label for humans reading the table. Never displayed: the UI translates from key.';
