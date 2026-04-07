create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.plants (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  species text not null,
  photo_path text,
  photo_url text,
  last_watering_date text,
  watering_interval_days integer not null,
  notes text not null default '',
  light_condition text not null default '',
  humidity_condition text not null default '',
  room_temperature text not null default '',
  condition_tags text not null default '[]',
  custom_care_comment text not null default '',
  risk_level text not null default 'low',
  last_inspection_date text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.care_tasks (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  plant_id text not null references public.plants(id) on delete cascade,
  type text not null,
  scheduled_date text not null,
  is_completed boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.care_logs (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  plant_id text not null references public.plants(id) on delete cascade,
  action_type text not null,
  action_date text not null,
  comment text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  notifications_enabled boolean not null default true,
  notification_hour integer not null default 9,
  notification_minute integer not null default 0,
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_plants_user_id on public.plants(user_id);
create index if not exists idx_plants_updated_at on public.plants(updated_at);
create index if not exists idx_care_tasks_user_id on public.care_tasks(user_id);
create index if not exists idx_care_tasks_plant_id on public.care_tasks(plant_id);
create index if not exists idx_care_tasks_updated_at on public.care_tasks(updated_at);
create index if not exists idx_care_logs_user_id on public.care_logs(user_id);
create index if not exists idx_care_logs_plant_id on public.care_logs(plant_id);
create index if not exists idx_care_logs_updated_at on public.care_logs(updated_at);

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

drop trigger if exists set_plants_updated_at on public.plants;
create trigger set_plants_updated_at
before update on public.plants
for each row
execute function public.set_updated_at();

drop trigger if exists set_care_tasks_updated_at on public.care_tasks;
create trigger set_care_tasks_updated_at
before update on public.care_tasks
for each row
execute function public.set_updated_at();

drop trigger if exists set_care_logs_updated_at on public.care_logs;
create trigger set_care_logs_updated_at
before update on public.care_logs
for each row
execute function public.set_updated_at();

drop trigger if exists set_user_settings_updated_at on public.user_settings;
create trigger set_user_settings_updated_at
before update on public.user_settings
for each row
execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, coalesce(new.email, ''))
  on conflict (id) do update
    set email = excluded.email,
        updated_at = timezone('utc', now());

  insert into public.user_settings (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

insert into storage.buckets (id, name, public)
values ('plant-photos', 'plant-photos', true)
on conflict (id) do nothing;
