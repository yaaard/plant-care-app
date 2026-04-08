alter table public.plant_ai_analyses enable row level security;

drop policy if exists "plant_ai_analyses_select_own" on public.plant_ai_analyses;
create policy "plant_ai_analyses_select_own"
on public.plant_ai_analyses
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "plant_ai_analyses_insert_own" on public.plant_ai_analyses;
create policy "plant_ai_analyses_insert_own"
on public.plant_ai_analyses
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "plant_ai_analyses_update_own" on public.plant_ai_analyses;
create policy "plant_ai_analyses_update_own"
on public.plant_ai_analyses
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "plant_ai_analyses_delete_own" on public.plant_ai_analyses;
create policy "plant_ai_analyses_delete_own"
on public.plant_ai_analyses
for delete
to authenticated
using (user_id = auth.uid());
