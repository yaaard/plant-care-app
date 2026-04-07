alter table public.profiles enable row level security;
alter table public.plants enable row level security;
alter table public.care_tasks enable row level security;
alter table public.care_logs enable row level security;
alter table public.user_settings enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using (id = auth.uid());

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
on public.profiles
for insert
to authenticated
with check (id = auth.uid());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists "plants_select_own" on public.plants;
create policy "plants_select_own"
on public.plants
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "plants_insert_own" on public.plants;
create policy "plants_insert_own"
on public.plants
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "plants_update_own" on public.plants;
create policy "plants_update_own"
on public.plants
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "plants_delete_own" on public.plants;
create policy "plants_delete_own"
on public.plants
for delete
to authenticated
using (user_id = auth.uid());

drop policy if exists "tasks_select_own" on public.care_tasks;
create policy "tasks_select_own"
on public.care_tasks
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "tasks_insert_own" on public.care_tasks;
create policy "tasks_insert_own"
on public.care_tasks
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "tasks_update_own" on public.care_tasks;
create policy "tasks_update_own"
on public.care_tasks
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "tasks_delete_own" on public.care_tasks;
create policy "tasks_delete_own"
on public.care_tasks
for delete
to authenticated
using (user_id = auth.uid());

drop policy if exists "logs_select_own" on public.care_logs;
create policy "logs_select_own"
on public.care_logs
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "logs_insert_own" on public.care_logs;
create policy "logs_insert_own"
on public.care_logs
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "logs_update_own" on public.care_logs;
create policy "logs_update_own"
on public.care_logs
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "logs_delete_own" on public.care_logs;
create policy "logs_delete_own"
on public.care_logs
for delete
to authenticated
using (user_id = auth.uid());

drop policy if exists "settings_select_own" on public.user_settings;
create policy "settings_select_own"
on public.user_settings
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "settings_insert_own" on public.user_settings;
create policy "settings_insert_own"
on public.user_settings
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "settings_update_own" on public.user_settings;
create policy "settings_update_own"
on public.user_settings
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "settings_delete_own" on public.user_settings;
create policy "settings_delete_own"
on public.user_settings
for delete
to authenticated
using (user_id = auth.uid());

drop policy if exists "storage_insert_own_photos" on storage.objects;
create policy "storage_insert_own_photos"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'plant-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "storage_select_own_photos" on storage.objects;
create policy "storage_select_own_photos"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'plant-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "storage_update_own_photos" on storage.objects;
create policy "storage_update_own_photos"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'plant-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'plant-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "storage_delete_own_photos" on storage.objects;
create policy "storage_delete_own_photos"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'plant-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);
