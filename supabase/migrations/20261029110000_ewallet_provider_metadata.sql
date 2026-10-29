alter table public.accounts
  add column e_wallet_provider text,
  add constraint accounts_e_wallet_provider_check
    check (
      e_wallet_provider is null
      or (
        account_type = 'E_WALLET'
        and pg_catalog.btrim(e_wallet_provider) <> ''
        and pg_catalog.char_length(e_wallet_provider) <= 120
      )
    );

grant insert (e_wallet_provider) on table public.accounts to authenticated;
grant update (e_wallet_provider) on table public.accounts to authenticated;

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
  account.bank_name,
  account.e_wallet_provider
from public.accounts as account
left join public.transactions as txn
  on txn.user_id = account.user_id
  and txn.account_id = account.id
group by account.id;
