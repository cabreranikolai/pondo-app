alter table public.accounts
  add column if not exists is_archived boolean not null default false;

alter table public.accounts
  drop constraint if exists accounts_account_type_check;

alter table public.accounts
  add constraint accounts_account_type_check
  check (account_type in ('CASH', 'BANK', 'E_WALLET', 'OTHER'));

create index if not exists accounts_user_archived_idx
  on public.accounts (user_id, is_archived, created_at desc);

revoke delete on table public.accounts from public, anon, authenticated;
revoke update (is_archived) on table public.accounts from public, anon;
grant update (is_archived) on table public.accounts to authenticated;

create or replace function private.prevent_transactions_on_archived_accounts()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  account_is_archived boolean;
begin
  select account.is_archived
    into account_is_archived
  from public.accounts as account
  where account.id = new.account_id
    and account.user_id = new.user_id
  for update;

  if not found or account_is_archived then
    raise exception 'Transactions require an active account owned by the user.'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

create trigger transactions_require_active_account
  before insert or update of user_id, account_id
  on public.transactions
  for each row execute function private.prevent_transactions_on_archived_accounts();

revoke all on function private.prevent_transactions_on_archived_accounts()
  from public, anon, authenticated;
