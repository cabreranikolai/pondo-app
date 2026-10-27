create table public.onboarding_progress (
  user_id uuid primary key references auth.users (id) on delete cascade,
  version integer not null default 1 check (version > 0),
  status text not null default 'NOT_STARTED'
    check (status in ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED')),
  tutorial_step smallint not null default 0
    check (tutorial_step between 0 and 6),
  checklist_dismissed boolean not null default false,
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now()
);

create trigger onboarding_progress_set_updated_at
  before update on public.onboarding_progress
  for each row execute function private.set_updated_at();

alter table public.onboarding_progress enable row level security;

create policy onboarding_progress_select_own
  on public.onboarding_progress for select to authenticated
  using (user_id = (select auth.uid()));

create policy onboarding_progress_insert_own
  on public.onboarding_progress for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy onboarding_progress_update_own
  on public.onboarding_progress for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

revoke all on table public.onboarding_progress from public, anon, authenticated;
grant select on public.onboarding_progress to authenticated;
grant insert (user_id) on public.onboarding_progress to authenticated;
grant update (status, tutorial_step, checklist_dismissed)
  on public.onboarding_progress to authenticated;

