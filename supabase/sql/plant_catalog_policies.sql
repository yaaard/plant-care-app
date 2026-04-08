alter table public.plant_catalog enable row level security;
alter table public.plant_catalog_symptoms enable row level security;

drop policy if exists "plant_catalog_select_authenticated" on public.plant_catalog;
create policy "plant_catalog_select_authenticated"
on public.plant_catalog
for select
to authenticated
using (true);

drop policy if exists "plant_catalog_symptoms_select_authenticated" on public.plant_catalog_symptoms;
create policy "plant_catalog_symptoms_select_authenticated"
on public.plant_catalog_symptoms
for select
to authenticated
using (true);
