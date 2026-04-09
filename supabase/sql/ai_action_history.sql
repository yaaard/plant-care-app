create table if not exists public.ai_action_history (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  plant_id text references public.plants(id) on delete set null,
  analysis_id text references public.plant_ai_analyses(id) on delete set null,
  chat_message_id text references public.chat_messages(id) on delete set null,
  action_type text not null check (
    action_type in (
      'create_task',
      'update_watering_interval',
      'mark_attention',
      'open_catalog_entry',
      'open_plant_details',
      'open_schedule',
      'dismiss'
    )
  ),
  action_payload jsonb not null default '{}'::jsonb,
  applied_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_ai_action_history_user_id
on public.ai_action_history(user_id);

create index if not exists idx_ai_action_history_plant_id
on public.ai_action_history(plant_id);

create index if not exists idx_ai_action_history_analysis_id
on public.ai_action_history(analysis_id);

create index if not exists idx_ai_action_history_chat_message_id
on public.ai_action_history(chat_message_id);

create index if not exists idx_ai_action_history_applied_at
on public.ai_action_history(applied_at desc);

drop trigger if exists set_ai_action_history_updated_at on public.ai_action_history;
create trigger set_ai_action_history_updated_at
before update on public.ai_action_history
for each row
execute function public.set_updated_at();

