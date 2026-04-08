create table if not exists public.chat_threads (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  plant_id text references public.plants(id) on delete cascade,
  title text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_chat_threads_user_id
on public.chat_threads(user_id);

create index if not exists idx_chat_threads_plant_id
on public.chat_threads(plant_id);

create index if not exists idx_chat_threads_updated_at
on public.chat_threads(updated_at desc);

drop trigger if exists set_chat_threads_updated_at on public.chat_threads;
create trigger set_chat_threads_updated_at
before update on public.chat_threads
for each row
execute function public.set_updated_at();
