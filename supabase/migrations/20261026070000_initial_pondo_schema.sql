create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;
grant usage on schema public to authenticated;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  role text not null default 'END_USER'
    check (role in ('SUPERADMIN', 'END_USER')),
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now()
);

create table public.accounts (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (pg_catalog.btrim(name) <> ''),
  account_type text not null check (account_type in ('CASH', 'BANK', 'E_WALLET')),
  opening_balance numeric(14, 2) not null default 0
    check (opening_balance <> 'NaN'::numeric),
  currency text not null default 'PHP'
    check (currency ~ '^[A-Z]{3}$'),
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  constraint accounts_user_id_id_key unique (user_id, id)
);

create table public.categories (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade,
  name text not null check (pg_catalog.btrim(name) <> ''),
  type text not null check (type in ('INCOME', 'EXPENSE')),
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now()
);

create table public.transactions (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  account_id uuid not null,
  category_id uuid references public.categories (id)
    on delete no action deferrable initially deferred,
  type text not null check (type in ('INCOME', 'EXPENSE', 'TRANSFER')),
  amount numeric(14, 2) not null
    check (amount > 0 and amount <> 'NaN'::numeric),
  description text,
  transaction_date timestamptz not null default pg_catalog.now(),
  transfer_group_id uuid,
  transfer_direction text,
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  constraint transactions_account_user_fk
    foreign key (user_id, account_id)
    references public.accounts (user_id, id)
    on delete no action deferrable initially deferred,
  constraint transactions_transfer_shape_check check (
    (
      type = 'TRANSFER'
      and transfer_group_id is not null
      and transfer_direction in ('OUT', 'IN')
      and category_id is null
    )
    or (
      type in ('INCOME', 'EXPENSE')
      and transfer_group_id is null
      and transfer_direction is null
    )
  )
);

create table public.budgets (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  category_id uuid not null references public.categories (id)
    on delete no action deferrable initially deferred,
  amount_limit numeric(14, 2) not null
    check (amount_limit > 0 and amount_limit <> 'NaN'::numeric),
  month date not null check (pg_catalog.date_part('day', month) = 1),
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  constraint budgets_user_category_month_key unique (user_id, category_id, month)
);

create table public.invitations (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  email text not null
    check (
      email = pg_catalog.lower(pg_catalog.btrim(email))
      and pg_catalog.strpos(email, '@') > 1
    ),
  role text not null default 'END_USER' check (role = 'END_USER'),
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  invited_by uuid not null references public.profiles (id) on delete restrict,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  created_at timestamptz not null default pg_catalog.now(),
  constraint invitations_expiry_check check (expires_at > created_at),
  constraint invitations_acceptance_check check (accepted_at is null or accepted_at >= created_at)
);

create index profiles_role_idx on public.profiles (role);
create index accounts_user_id_idx on public.accounts (user_id);
create unique index categories_system_name_type_key
  on public.categories (type, pg_catalog.lower(name))
  where user_id is null;
create unique index categories_user_name_type_key
  on public.categories (user_id, type, pg_catalog.lower(name))
  where user_id is not null;
create index categories_user_id_idx on public.categories (user_id);
create index transactions_user_date_idx
  on public.transactions (user_id, transaction_date desc);
create index transactions_account_date_idx
  on public.transactions (account_id, transaction_date desc);
create index transactions_category_date_idx
  on public.transactions (category_id, transaction_date desc)
  where category_id is not null;
create unique index transactions_transfer_leg_key
  on public.transactions (transfer_group_id, transfer_direction)
  where type = 'TRANSFER';
create index transactions_transfer_group_idx
  on public.transactions (transfer_group_id)
  where transfer_group_id is not null;
create index budgets_user_month_idx on public.budgets (user_id, month);
create index budgets_category_id_idx on public.budgets (category_id);
create index invitations_email_idx on public.invitations (email);
create index invitations_expires_at_idx on public.invitations (expires_at);

insert into public.categories (user_id, name, type)
values
  (null, 'Salary', 'INCOME'),
  (null, 'Other income', 'INCOME'),
  (null, 'Food and groceries', 'EXPENSE'),
  (null, 'Housing', 'EXPENSE'),
  (null, 'Transportation', 'EXPENSE'),
  (null, 'Utilities', 'EXPENSE'),
  (null, 'Health', 'EXPENSE'),
  (null, 'Shopping', 'EXPENSE'),
  (null, 'Other expense', 'EXPENSE');

create or replace function private.is_superadmin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles as profile
    where profile.id = auth.uid()
      and profile.role = 'SUPERADMIN'
  );
$$;

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := pg_catalog.now();
  return new;
end;
$$;

create or replace function private.guard_profile_role_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.role is distinct from old.role
     and not private.is_superadmin()
     and current_user <> 'postgres'
     and not pg_catalog.pg_has_role(
       current_user,
       'pg_database_owner',
       'member'
     ) then
    raise exception 'Profile role changes require an authorized administrator.'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

create or replace function private.create_profile_for_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, role)
  values (
    new.id,
    nullif(pg_catalog.btrim(new.raw_user_meta_data ->> 'display_name'), ''),
    'END_USER'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create or replace function private.validate_transaction_category()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  category_owner uuid;
  category_type text;
begin
  if new.type = 'TRANSFER' or new.category_id is null then
    return new;
  end if;

  select category.user_id, category.type
    into category_owner, category_type
  from public.categories as category
  where category.id = new.category_id;

  if not found then
    raise exception 'Transaction category does not exist.';
  end if;

  if category_owner is not null and category_owner <> new.user_id then
    raise exception 'Transaction category must be system-wide or owned by the transaction user.'
      using errcode = '23514';
  end if;

  if category_type <> new.type then
    raise exception 'Transaction category type must match the transaction type.'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

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

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function private.set_updated_at();
create trigger profiles_guard_role_change
  before update of role on public.profiles
  for each row execute function private.guard_profile_role_change();
create trigger accounts_set_updated_at
  before update on public.accounts
  for each row execute function private.set_updated_at();
create trigger categories_set_updated_at
  before update on public.categories
  for each row execute function private.set_updated_at();
create trigger transactions_set_updated_at
  before update on public.transactions
  for each row execute function private.set_updated_at();
create trigger budgets_set_updated_at
  before update on public.budgets
  for each row execute function private.set_updated_at();
create trigger transactions_validate_category
  before insert or update of user_id, category_id, type on public.transactions
  for each row execute function private.validate_transaction_category();
create trigger budgets_validate_category
  before insert or update of user_id, category_id on public.budgets
  for each row execute function private.validate_budget_category();
create trigger pondo_create_profile_after_auth_user
  after insert on auth.users
  for each row execute function private.create_profile_for_auth_user();

alter table public.profiles enable row level security;
alter table public.accounts enable row level security;
alter table public.categories enable row level security;
alter table public.transactions enable row level security;
alter table public.budgets enable row level security;
alter table public.invitations enable row level security;

create policy profiles_select_self_or_admin
  on public.profiles for select to authenticated
  using (id = (select auth.uid()) or (select private.is_superadmin()));
create policy profiles_update_self_or_admin
  on public.profiles for update to authenticated
  using (id = (select auth.uid()) or (select private.is_superadmin()))
  with check (id = (select auth.uid()) or (select private.is_superadmin()));

create policy accounts_select_own
  on public.accounts for select to authenticated
  using (user_id = (select auth.uid()));
create policy accounts_insert_own
  on public.accounts for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy accounts_update_own
  on public.accounts for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy accounts_delete_own
  on public.accounts for delete to authenticated
  using (user_id = (select auth.uid()));

create policy categories_select_system_or_own
  on public.categories for select to authenticated
  using (user_id is null or user_id = (select auth.uid()));
create policy categories_insert_own
  on public.categories for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy categories_update_own
  on public.categories for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy categories_delete_own
  on public.categories for delete to authenticated
  using (user_id = (select auth.uid()));

create policy transactions_select_own
  on public.transactions for select to authenticated
  using (user_id = (select auth.uid()));
create policy transactions_insert_non_transfer_own
  on public.transactions for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and type in ('INCOME', 'EXPENSE')
  );
create policy transactions_update_non_transfer_own
  on public.transactions for update to authenticated
  using (user_id = (select auth.uid()) and type <> 'TRANSFER')
  with check (
    user_id = (select auth.uid())
    and type in ('INCOME', 'EXPENSE')
  );
create policy transactions_delete_non_transfer_own
  on public.transactions for delete to authenticated
  using (user_id = (select auth.uid()) and type <> 'TRANSFER');

create policy budgets_select_own
  on public.budgets for select to authenticated
  using (user_id = (select auth.uid()));
create policy budgets_insert_own
  on public.budgets for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy budgets_update_own
  on public.budgets for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy budgets_delete_own
  on public.budgets for delete to authenticated
  using (user_id = (select auth.uid()));

revoke all on table
  public.profiles,
  public.accounts,
  public.categories,
  public.transactions,
  public.budgets,
  public.invitations
from public, anon, authenticated;

grant select on public.profiles to authenticated;
grant update (display_name) on public.profiles to authenticated;

grant select, delete on public.accounts to authenticated;
grant insert (user_id, name, account_type, opening_balance, currency)
  on public.accounts to authenticated;
grant update (name, account_type, opening_balance, currency)
  on public.accounts to authenticated;

grant select, delete on public.categories to authenticated;
grant insert (user_id, name, type) on public.categories to authenticated;
grant update (name) on public.categories to authenticated;

grant select, delete on public.transactions to authenticated;
grant insert (
  user_id, account_id, category_id, type, amount, description, transaction_date
) on public.transactions to authenticated;
grant update (
  account_id, category_id, type, amount, description, transaction_date
) on public.transactions to authenticated;

grant select, delete on public.budgets to authenticated;
grant insert (user_id, category_id, amount_limit, month)
  on public.budgets to authenticated;
grant update (category_id, amount_limit, month) on public.budgets to authenticated;

create or replace function public.admin_set_profile_role(
  p_user_id uuid,
  p_role text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not private.is_superadmin() then
    raise exception 'Only a superadmin may administer profile roles.'
      using errcode = '42501';
  end if;

  if p_role is null or p_role not in ('SUPERADMIN', 'END_USER') then
    raise exception 'Unsupported profile role.'
      using errcode = '22023';
  end if;

  update public.profiles
  set role = p_role
  where id = p_user_id;

  if not found then
    raise exception 'Profile does not exist.'
      using errcode = 'P0002';
  end if;
end;
$$;

create or replace function public.admin_create_invitation(
  p_email text,
  p_expires_at timestamptz
)
returns table (invitation_id uuid, invitation_token text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  generated_token text;
  generated_hash text;
  new_invitation_id uuid;
begin
  if auth.uid() is null or not private.is_superadmin() then
    raise exception 'Only a superadmin may create invitations.'
      using errcode = '42501';
  end if;

  if p_email is null
     or pg_catalog.strpos(pg_catalog.btrim(p_email), '@') <= 1
     or p_expires_at is null
     or p_expires_at <= pg_catalog.now()
     or p_expires_at > pg_catalog.now() + interval '30 days' then
    raise exception 'Invitation email or expiration is invalid.'
      using errcode = '22023';
  end if;

  generated_token := pg_catalog.encode(extensions.gen_random_bytes(32), 'hex');
  generated_hash := pg_catalog.encode(
    extensions.digest(pg_catalog.convert_to(generated_token, 'UTF8'), 'sha256'),
    'hex'
  );

  insert into public.invitations (email, role, token_hash, invited_by, expires_at)
  values (
    pg_catalog.lower(pg_catalog.btrim(p_email)),
    'END_USER',
    generated_hash,
    auth.uid(),
    p_expires_at
  )
  returning id into new_invitation_id;

  return query select new_invitation_id, generated_token;
end;
$$;

create or replace function public.admin_list_invitations()
returns table (
  invitation_id uuid,
  email text,
  role text,
  invited_by uuid,
  expires_at timestamptz,
  accepted_at timestamptz,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not private.is_superadmin() then
    raise exception 'Only a superadmin may list invitations.'
      using errcode = '42501';
  end if;

  return query
  select invitation.id,
         invitation.email,
         invitation.role,
         invitation.invited_by,
         invitation.expires_at,
         invitation.accepted_at,
         invitation.created_at
  from public.invitations as invitation
  order by invitation.created_at desc;
end;
$$;

create or replace function public.admin_revoke_invitation(p_invitation_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  removed_count integer;
begin
  if auth.uid() is null or not private.is_superadmin() then
    raise exception 'Only a superadmin may revoke invitations.'
      using errcode = '42501';
  end if;

  delete from public.invitations
  where id = p_invitation_id
    and accepted_at is null;
  get diagnostics removed_count = row_count;
  return removed_count = 1;
end;
$$;

create or replace function public.accept_invitation(p_token text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid;
  current_user_email text;
  current_user_email_confirmed_at timestamptz;
  token_digest text;
  matched_invitation_id uuid;
  invited_role text;
begin
  current_user_id := auth.uid();
  select pg_catalog.lower(pg_catalog.btrim(auth_user.email)),
         auth_user.email_confirmed_at
    into current_user_email, current_user_email_confirmed_at
  from auth.users as auth_user
  where auth_user.id = current_user_id;

  if current_user_id is null
     or current_user_email is null
     or current_user_email_confirmed_at is null
     or p_token is null
     or p_token !~ '^[0-9a-f]{64}$' then
    return false;
  end if;

  token_digest := pg_catalog.encode(
    extensions.digest(pg_catalog.convert_to(p_token, 'UTF8'), 'sha256'),
    'hex'
  );

  select invitation.id, invitation.role
    into matched_invitation_id, invited_role
  from public.invitations as invitation
  where invitation.token_hash = token_digest
    and invitation.email = current_user_email
    and invitation.accepted_at is null
    and invitation.expires_at > pg_catalog.now()
  for update;

  if not found then
    return false;
  end if;

  update public.profiles
  set role = invited_role
  where id = current_user_id
    and role = 'END_USER';

  if not found then
    return false;
  end if;

  update public.invitations
  set accepted_at = pg_catalog.now()
  where id = matched_invitation_id;

  return true;
end;
$$;

create or replace function public.create_transfer(
  p_from_account_id uuid,
  p_to_account_id uuid,
  p_amount numeric,
  p_transaction_date timestamptz default pg_catalog.now(),
  p_description text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid;
  transfer_id uuid;
  from_currency text;
  to_currency text;
begin
  current_user_id := auth.uid();

  if current_user_id is null then
    raise exception 'Authentication is required to create a transfer.'
      using errcode = '42501';
  end if;

  if p_from_account_id is null
     or p_to_account_id is null
     or p_from_account_id = p_to_account_id
     or p_amount is null
     or p_amount <= 0
     or p_amount = 'NaN'::numeric
     or p_transaction_date is null then
    raise exception 'Transfer details are invalid.'
      using errcode = '22023';
  end if;

  select currency into from_currency
  from public.accounts
  where id = p_from_account_id and user_id = current_user_id;
  if not found then
    raise exception 'Both transfer accounts must belong to the authenticated user.'
      using errcode = '42501';
  end if;

  select currency into to_currency
  from public.accounts
  where id = p_to_account_id and user_id = current_user_id;
  if not found then
    raise exception 'Both transfer accounts must belong to the authenticated user.'
      using errcode = '42501';
  end if;

  if from_currency <> to_currency then
    raise exception 'Transfer accounts must use the same currency.'
      using errcode = '22023';
  end if;

  transfer_id := pg_catalog.gen_random_uuid();

  insert into public.transactions (
    user_id, account_id, type, amount, description, transaction_date,
    transfer_group_id, transfer_direction
  )
  values
    (
      current_user_id, p_from_account_id, 'TRANSFER', p_amount, p_description,
      p_transaction_date, transfer_id, 'OUT'
    ),
    (
      current_user_id, p_to_account_id, 'TRANSFER', p_amount, p_description,
      p_transaction_date, transfer_id, 'IN'
    );

  return transfer_id;
end;
$$;

revoke all on function private.is_superadmin() from public, anon;
grant execute on function private.is_superadmin() to authenticated;
revoke all on function private.set_updated_at() from public, anon, authenticated;
revoke all on function private.guard_profile_role_change() from public, anon, authenticated;
revoke all on function private.create_profile_for_auth_user() from public, anon, authenticated;
revoke all on function private.validate_transaction_category() from public, anon, authenticated;
revoke all on function private.validate_budget_category() from public, anon, authenticated;
revoke all on function public.admin_set_profile_role(uuid, text) from public, anon;
grant execute on function public.admin_set_profile_role(uuid, text) to authenticated;
revoke all on function public.admin_create_invitation(text, timestamptz) from public, anon;
grant execute on function public.admin_create_invitation(text, timestamptz) to authenticated;
revoke all on function public.admin_list_invitations() from public, anon;
grant execute on function public.admin_list_invitations() to authenticated;
revoke all on function public.admin_revoke_invitation(uuid) from public, anon;
grant execute on function public.admin_revoke_invitation(uuid) to authenticated;
revoke all on function public.accept_invitation(text) from public, anon;
grant execute on function public.accept_invitation(text) to authenticated;
revoke all on function public.create_transfer(uuid, uuid, numeric, timestamptz, text) from public, anon;
grant execute on function public.create_transfer(uuid, uuid, numeric, timestamptz, text) to authenticated;
