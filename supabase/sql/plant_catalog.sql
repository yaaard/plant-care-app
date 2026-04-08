create table if not exists public.plant_catalog (
  id text primary key,
  slug text not null unique,
  name_ru text not null,
  name_latin text not null default '',
  category text not null default '',
  description text not null default '',
  watering_interval_min integer not null default 7,
  watering_interval_max integer not null default 7,
  light_level text not null default '',
  humidity_level text not null default '',
  temperature_min integer not null default 18,
  temperature_max integer not null default 25,
  care_tips text not null default '',
  risk_notes text not null default '',
  soil_type text not null default '',
  fertilizing_info text not null default '',
  spraying_needed boolean not null default false,
  pet_safe boolean not null default false,
  difficulty_level text not null default 'средний',
  inspection_interval_days integer not null default 14,
  spraying_interval_days integer,
  fertilizing_interval_days integer,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.plants
add column if not exists catalog_plant_id text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'plants_catalog_plant_id_fkey'
  ) then
    alter table public.plants
    add constraint plants_catalog_plant_id_fkey
    foreign key (catalog_plant_id)
    references public.plant_catalog(id)
    on delete set null;
  end if;
end;
$$;

create index if not exists idx_plant_catalog_slug
on public.plant_catalog(slug);

create index if not exists idx_plant_catalog_name_ru
on public.plant_catalog(name_ru);

create index if not exists idx_plant_catalog_name_latin
on public.plant_catalog(name_latin);

create index if not exists idx_plants_catalog_plant_id
on public.plants(catalog_plant_id);

drop trigger if exists set_plant_catalog_updated_at on public.plant_catalog;
create trigger set_plant_catalog_updated_at
before update on public.plant_catalog
for each row
execute function public.set_updated_at();
