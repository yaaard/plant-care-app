create table if not exists public.plant_ai_analyses (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  plant_id text not null references public.plants(id) on delete cascade,
  photo_path text,
  model_name text not null,
  summary text not null,
  overall_condition text not null check (overall_condition in ('healthy', 'needs_attention', 'at_risk')),
  urgency text not null check (urgency in ('low', 'medium', 'high')),
  observed_signs jsonb not null default '[]'::jsonb,
  possible_causes jsonb not null default '[]'::jsonb,
  watering_advice text not null default '',
  light_advice text not null default '',
  humidity_advice text not null default '',
  recommended_actions jsonb not null default '[]'::jsonb,
  actions jsonb not null default '[]'::jsonb,
  confidence_note text not null default '',
  raw_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.plant_ai_analyses
alter column model_name set default 'gemini-2.5-flash';

alter table public.plant_ai_analyses
add column if not exists actions jsonb not null default '[]'::jsonb;

create index if not exists idx_plant_ai_analyses_user_id
on public.plant_ai_analyses(user_id);

create index if not exists idx_plant_ai_analyses_plant_id
on public.plant_ai_analyses(plant_id);

create index if not exists idx_plant_ai_analyses_created_at
on public.plant_ai_analyses(created_at desc);

create index if not exists idx_plant_ai_analyses_updated_at
on public.plant_ai_analyses(updated_at desc);

drop trigger if exists set_plant_ai_analyses_updated_at on public.plant_ai_analyses;
create trigger set_plant_ai_analyses_updated_at
before update on public.plant_ai_analyses
for each row
execute function public.set_updated_at();
