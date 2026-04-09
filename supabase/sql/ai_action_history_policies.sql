alter table public.ai_action_history enable row level security;

drop policy if exists "ai_action_history_select_own" on public.ai_action_history;
create policy "ai_action_history_select_own"
on public.ai_action_history
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "ai_action_history_insert_own" on public.ai_action_history;
create policy "ai_action_history_insert_own"
on public.ai_action_history
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "ai_action_history_update_own" on public.ai_action_history;
create policy "ai_action_history_update_own"
on public.ai_action_history
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "ai_action_history_delete_own" on public.ai_action_history;
create policy "ai_action_history_delete_own"
on public.ai_action_history
for delete
to authenticated
using (user_id = auth.uid());
