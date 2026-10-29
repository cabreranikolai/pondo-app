create table public.savings_goals (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null
    check (
      pg_catalog.btrim(name) <> ''
      and pg_catalog.char_length(name) <= 80
    ),
  target_amount numeric(14, 2) not null
    check (
      target_amount <> 'NaN'::numeric
      and target_amount > 0
    ),
  amount_saved numeric(14, 2) not null default 0
    check (
      amount_saved <> 'NaN'::numeric
      and amount_saved >= 0
    ),
  target_date date,
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now()
);

create index savings_goals_user_created_idx
  on public.savings_goals (user_id, created_at desc);

create trigger savings_goals_set_updated_at
  before update on public.savings_goals
  for each row execute function private.set_updated_at();

alter table public.savings_goals enable row level security;

create policy savings_goals_select_own
  on public.savings_goals for select to authenticated
  using (user_id = (select auth.uid()));
create policy savings_goals_insert_own
  on public.savings_goals for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy savings_goals_update_own
  on public.savings_goals for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy savings_goals_delete_own
  on public.savings_goals for delete to authenticated
  using (user_id = (select auth.uid()));

revoke all on table public.savings_goals from public, anon, authenticated;
grant select, delete on public.savings_goals to authenticated;
grant insert (user_id, name, target_amount, target_date)
  on public.savings_goals to authenticated;
grant update (name, target_amount, target_date)
  on public.savings_goals to authenticated;

create or replace function public.adjust_savings_goal(
  p_goal_id uuid,
  p_amount numeric,
  p_action text
)
returns numeric
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  current_amount numeric;
  updated_amount numeric;
begin
  if current_user_id is null then
    raise exception 'Authentication is required.'
      using errcode = '42501';
  end if;

  if p_amount is null
    or p_amount = 'NaN'::numeric
    or p_amount <= 0
    or p_amount > 999999999999.99
    or p_amount <> pg_catalog.round(p_amount, 2)
    or p_action is null
    or p_action not in ('ADD', 'WITHDRAW')
  then
    raise exception 'A positive amount and valid action are required.'
      using errcode = '22023';
  end if;

  select goal.amount_saved
    into current_amount
  from public.savings_goals as goal
  where goal.id = p_goal_id
    and goal.user_id = current_user_id
  for update;

  if not found then
    raise exception 'Savings goal was not found.'
      using errcode = 'P0002';
  end if;

  if p_action = 'WITHDRAW' and p_amount > current_amount then
    raise exception 'Withdrawal exceeds the amount saved for this goal.'
      using errcode = '23514';
  end if;

  update public.savings_goals as goal
    set amount_saved = case
      when p_action = 'ADD' then goal.amount_saved + p_amount
      else goal.amount_saved - p_amount
    end
  where goal.id = p_goal_id
    and goal.user_id = current_user_id
  returning goal.amount_saved into updated_amount;

  return updated_amount;
end;
$$;

revoke all on function public.adjust_savings_goal(uuid, numeric, text)
  from public, anon, authenticated;
grant execute on function public.adjust_savings_goal(uuid, numeric, text)
  to authenticated;
