create table if not exists public.plant_catalog_symptoms (
  id text primary key,
  plant_catalog_id text not null references public.plant_catalog(id) on delete cascade,
  symptom_code text not null,
  symptom_name_ru text not null,
  possible_cause text not null default '',
  recommended_action text not null default '',
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_plant_catalog_symptoms_plant_id
on public.plant_catalog_symptoms(plant_catalog_id);

create index if not exists idx_plant_catalog_symptoms_code
on public.plant_catalog_symptoms(symptom_code);
