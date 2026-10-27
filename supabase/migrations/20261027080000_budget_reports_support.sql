alter table public.budgets
  alter column category_id drop not null;

create unique index if not exists budgets_user_month_overall_key
  on public.budgets (user_id, month)
  where category_id is null;

create or replace function private.validate_budget_category()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  category_owner uuid;
  category_type text;
begin
  if new.category_id is null then
    return new;
  end if;

  select category.user_id, category.type
    into category_owner, category_type
  from public.categories as category
  where category.id = new.category_id;

  if not found then
    raise exception 'Budget category does not exist.';
  end if;

  if category_owner is not null and category_owner <> new.user_id then
    raise exception 'Budget category must be system-wide or owned by the budget user.'
      using errcode = '23514';
  end if;

  if category_type <> 'EXPENSE' then
    raise exception 'Budgets require an expense category.'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

create or replace function public.get_financial_report(
  p_start timestamptz,
  p_end timestamptz,
  p_timezone text
)
returns table (
  month date,
  category_id uuid,
  category_name text,
  income_amount text,
  expense_amount text
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    pg_catalog.date_trunc(
      'month',
      txn.transaction_date at time zone p_timezone
    )::date as month,
    txn.category_id,
    coalesce(category.name, 'Uncategorized') as category_name,
    coalesce(
      pg_catalog.sum(txn.amount) filter (
        where txn.type = 'INCOME'
      ),
      0::numeric
    )::text as income_amount,
    coalesce(
      pg_catalog.sum(txn.amount) filter (
        where txn.type = 'EXPENSE'
      ),
      0::numeric
    )::text as expense_amount
  from public.transactions as txn
  left join public.categories as category
    on category.id = txn.category_id
  where txn.user_id = (select auth.uid())
    and txn.type in ('INCOME', 'EXPENSE')
    and txn.transaction_date >= p_start
    and txn.transaction_date < p_end
    and p_start < p_end
    and p_end <= p_start + interval '5 years'
    and p_timezone in (
      select timezone.name from pg_catalog.pg_timezone_names as timezone
    )
  group by 1, 2, 3
  order by 1, 3;
$$;

revoke all on function public.get_financial_report(timestamptz, timestamptz, text)
  from public, anon, authenticated;
grant execute on function public.get_financial_report(timestamptz, timestamptz, text)
  to authenticated;

revoke all on function private.validate_budget_category()
  from public, anon, authenticated;
