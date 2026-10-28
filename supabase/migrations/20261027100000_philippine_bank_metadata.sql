alter table public.accounts
  add column bank_name text,
  add constraint accounts_bank_name_check
    check (
      bank_name is null
      or (
        account_type = 'BANK'
        and pg_catalog.btrim(bank_name) <> ''
        and pg_catalog.char_length(bank_name) <= 120
      )
    );

grant insert (bank_name) on table public.accounts to authenticated;
grant update (bank_name) on table public.accounts to authenticated;

create or replace view public.account_balances
with (security_invoker = true)
as
select
  account.id,
  account.user_id,
  account.name,
  account.account_type,
  account.opening_balance,
  account.currency,
  account.is_archived,
  account.created_at,
  account.updated_at,
  account.opening_balance + coalesce(
    pg_catalog.sum(
      case
        when txn.type = 'INCOME' then txn.amount
        when txn.type = 'EXPENSE' then -txn.amount
        when txn.type = 'TRANSFER'
          and txn.transfer_direction = 'IN' then txn.amount
        when txn.type = 'TRANSFER'
          and txn.transfer_direction = 'OUT' then -txn.amount
        else 0::numeric
      end
    ),
    0::numeric
  ) as current_balance,
  account.bank_name
from public.accounts as account
left join public.transactions as txn
  on txn.user_id = account.user_id
  and txn.account_id = account.id
group by account.id;
