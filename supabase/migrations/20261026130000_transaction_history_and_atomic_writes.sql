do $$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'accounts'
      and column_name = 'is_archived'
  ) then
    raise exception
      'Apply 20261026110000_accounts_archive_and_other_type.sql before this migration.';
  end if;
end;
$$;

create table private.transaction_requests (
  user_id uuid not null references auth.users (id) on delete cascade,
  request_id uuid not null,
  payload jsonb not null,
  result_id uuid not null,
  created_at timestamptz not null default pg_catalog.now(),
  primary key (user_id, request_id)
);

revoke all on table private.transaction_requests from public, anon, authenticated;

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
  if new.type = 'TRANSFER' then
    return new;
  end if;

  if new.category_id is null then
    raise exception 'Income and expense transactions require a category.'
      using errcode = '23514';
  end if;

  select category.user_id, category.type
    into category_owner, category_type
  from public.categories as category
  where category.id = new.category_id;

  if not found then
    raise exception 'Transaction category does not exist.'
      using errcode = '23514';
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

create or replace function public.create_transaction(
  p_request_id uuid,
  p_type text,
  p_account_id uuid,
  p_destination_account_id uuid,
  p_category_id uuid,
  p_amount numeric,
  p_transaction_date timestamptz,
  p_description text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  normalized_description text := nullif(pg_catalog.btrim(p_description), '');
  normalized_amount numeric;
  request_payload jsonb;
  operation_id uuid := pg_catalog.gen_random_uuid();
  existing_payload jsonb;
  existing_result_id uuid;
  account_count integer;
  source_currency text;
  destination_currency text;
  category_type text;
begin
  if current_user_id is null then
    raise exception 'Authentication is required to create a transaction.'
      using errcode = '42501';
  end if;

  if p_request_id is null
     or p_type is null
     or p_type not in ('INCOME', 'EXPENSE', 'TRANSFER')
     or p_account_id is null
     or p_amount is null
     or p_amount = 'NaN'::numeric
     or p_amount <= 0
     or p_amount > 999999999999.99
     or p_amount <> pg_catalog.round(p_amount, 2)
     or p_transaction_date is null
     or not pg_catalog.isfinite(p_transaction_date)
     or pg_catalog.char_length(coalesce(p_description, '')) > 500 then
    raise exception 'Transaction details are invalid.'
      using errcode = '22023';
  end if;

  normalized_amount := p_amount::numeric(14, 2);

  if p_type = 'TRANSFER' then
    if p_destination_account_id is null
       or p_account_id = p_destination_account_id
       or p_category_id is not null then
      raise exception 'Transfer details are invalid.'
        using errcode = '22023';
    end if;
  elsif p_destination_account_id is not null or p_category_id is null then
    raise exception 'Income and expense transactions require a category and one account.'
      using errcode = '22023';
  end if;

  request_payload := pg_catalog.jsonb_build_object(
    'type', p_type,
    'account_id', p_account_id,
    'destination_account_id', p_destination_account_id,
    'category_id', p_category_id,
    'amount', normalized_amount,
    'transaction_date_epoch', extract(epoch from p_transaction_date),
    'description', normalized_description
  );

  insert into private.transaction_requests (
    user_id, request_id, payload, result_id
  )
  values (
    current_user_id, p_request_id, request_payload, operation_id
  )
  on conflict (user_id, request_id) do nothing;

  if not found then
    select request.payload, request.result_id
      into existing_payload, existing_result_id
    from private.transaction_requests as request
    where request.user_id = current_user_id
      and request.request_id = p_request_id;

    if not found or existing_payload is distinct from request_payload then
      raise exception 'This transaction request was already used with different details.'
        using errcode = '22023';
    end if;

    return existing_result_id;
  end if;

  perform account.id
  from public.accounts as account
  where account.user_id = current_user_id
    and account.is_archived = false
    and (
      account.id = p_account_id
      or (p_type = 'TRANSFER' and account.id = p_destination_account_id)
    )
  order by account.id
  for update;
  get diagnostics account_count = row_count;

  if (p_type = 'TRANSFER' and account_count <> 2)
     or (p_type <> 'TRANSFER' and account_count <> 1) then
    raise exception 'Select active accounts that belong to your account.'
      using errcode = '42501';
  end if;

  select account.currency
    into source_currency
  from public.accounts as account
  where account.id = p_account_id
    and account.user_id = current_user_id;

  if p_type = 'TRANSFER' then
    select account.currency
      into destination_currency
    from public.accounts as account
    where account.id = p_destination_account_id
      and account.user_id = current_user_id;

    if source_currency <> destination_currency then
      raise exception 'Transfer accounts must use the same currency.'
        using errcode = '22023';
    end if;

    insert into public.transactions (
      user_id, account_id, type, amount, description, transaction_date,
      transfer_group_id, transfer_direction
    )
    values
      (
        current_user_id, p_account_id, 'TRANSFER', normalized_amount,
        normalized_description, p_transaction_date, operation_id, 'OUT'
      ),
      (
        current_user_id, p_destination_account_id, 'TRANSFER', normalized_amount,
        normalized_description, p_transaction_date, operation_id, 'IN'
      );
  else
    select category.type
      into category_type
    from public.categories as category
    where category.id = p_category_id
      and (category.user_id is null or category.user_id = current_user_id);

    if not found or category_type <> p_type then
      raise exception 'Choose a category matching this transaction type.'
        using errcode = '23514';
    end if;

    insert into public.transactions (
      user_id, account_id, category_id, type, amount,
      description, transaction_date
    )
    values (
      current_user_id, p_account_id, p_category_id, p_type, normalized_amount,
      normalized_description, p_transaction_date
    )
    returning id into operation_id;

    update private.transaction_requests
    set result_id = operation_id
    where user_id = current_user_id
      and request_id = p_request_id;
  end if;

  return operation_id;
end;
$$;

create or replace function public.update_transfer(
  p_transfer_group_id uuid,
  p_from_account_id uuid,
  p_to_account_id uuid,
  p_amount numeric,
  p_transaction_date timestamptz,
  p_description text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  normalized_description text := nullif(pg_catalog.btrim(p_description), '');
  transfer_count integer;
  out_count integer;
  in_count integer;
  from_account_id uuid;
  to_account_id uuid;
  from_account_archived boolean;
  to_account_archived boolean;
  source_currency text;
  destination_currency text;
  account_count integer;
begin
  if current_user_id is null then
    raise exception 'Authentication is required to update a transfer.'
      using errcode = '42501';
  end if;

  if p_transfer_group_id is null
     or p_from_account_id is null
     or p_to_account_id is null
     or p_from_account_id = p_to_account_id
     or p_amount is null
     or p_amount = 'NaN'::numeric
     or p_amount <= 0
     or p_amount > 999999999999.99
     or p_amount <> pg_catalog.round(p_amount, 2)
     or p_transaction_date is null
     or not pg_catalog.isfinite(p_transaction_date)
     or pg_catalog.char_length(coalesce(p_description, '')) > 500 then
    raise exception 'Transfer details are invalid.'
      using errcode = '22023';
  end if;

  perform txn.id
  from public.transactions as txn
  where txn.user_id = current_user_id
    and txn.type = 'TRANSFER'
    and txn.transfer_group_id = p_transfer_group_id
  order by txn.transfer_direction
  for update;

  select
    pg_catalog.count(*),
    pg_catalog.count(*) filter (where txn.transfer_direction = 'OUT'),
    pg_catalog.count(*) filter (where txn.transfer_direction = 'IN')
  into transfer_count, out_count, in_count
  from public.transactions as txn
  where txn.user_id = current_user_id
    and txn.type = 'TRANSFER'
    and txn.transfer_group_id = p_transfer_group_id;

  if transfer_count <> 2 or out_count <> 1 or in_count <> 1 then
    raise exception 'The transfer does not exist or is incomplete.'
      using errcode = 'P0002';
  end if;

  select txn.account_id
    into from_account_id
  from public.transactions as txn
  where txn.user_id = current_user_id
    and txn.transfer_group_id = p_transfer_group_id
    and txn.transfer_direction = 'OUT';

  select txn.account_id
    into to_account_id
  from public.transactions as txn
  where txn.user_id = current_user_id
    and txn.transfer_group_id = p_transfer_group_id
    and txn.transfer_direction = 'IN';

  perform account.id
  from public.accounts as account
  where account.user_id = current_user_id
    and account.id in (p_from_account_id, p_to_account_id)
  order by account.id
  for update;
  get diagnostics account_count = row_count;

  if account_count <> 2 then
    raise exception 'Both transfer accounts must belong to the authenticated user.'
      using errcode = '42501';
  end if;

  select account.currency, account.is_archived
    into source_currency, from_account_archived
  from public.accounts as account
  where account.id = p_from_account_id
    and account.user_id = current_user_id;
  select account.currency, account.is_archived
    into destination_currency, to_account_archived
  from public.accounts as account
  where account.id = p_to_account_id
    and account.user_id = current_user_id;

  if source_currency <> destination_currency then
    raise exception 'Transfer accounts must use the same currency.'
      using errcode = '22023';
  end if;

  if (from_account_archived and p_from_account_id <> from_account_id)
     or (to_account_archived and p_to_account_id <> to_account_id) then
    raise exception 'Restore an archived account before moving a transfer to it.'
      using errcode = '23514';
  end if;

  update public.transactions as txn
  set amount = p_amount::numeric(14, 2),
      description = normalized_description,
      transaction_date = p_transaction_date
  where txn.user_id = current_user_id
    and txn.type = 'TRANSFER'
    and txn.transfer_group_id = p_transfer_group_id;

  if p_from_account_id <> from_account_id then
    update public.transactions as txn
    set account_id = p_from_account_id
    where txn.user_id = current_user_id
      and txn.type = 'TRANSFER'
      and txn.transfer_group_id = p_transfer_group_id
      and txn.transfer_direction = 'OUT';
  end if;

  if p_to_account_id <> to_account_id then
    update public.transactions as txn
    set account_id = p_to_account_id
    where txn.user_id = current_user_id
      and txn.type = 'TRANSFER'
      and txn.transfer_group_id = p_transfer_group_id
      and txn.transfer_direction = 'IN';
  end if;
end;
$$;

create or replace function public.delete_transfer(p_transfer_group_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  transfer_count integer;
  out_count integer;
  in_count integer;
begin
  if current_user_id is null then
    raise exception 'Authentication is required to delete a transfer.'
      using errcode = '42501';
  end if;

  if p_transfer_group_id is null then
    raise exception 'A transfer is required.'
      using errcode = '22023';
  end if;

  perform txn.id
  from public.transactions as txn
  where txn.user_id = current_user_id
    and txn.type = 'TRANSFER'
    and txn.transfer_group_id = p_transfer_group_id
  order by txn.transfer_direction
  for update;

  select
    pg_catalog.count(*),
    pg_catalog.count(*) filter (where txn.transfer_direction = 'OUT'),
    pg_catalog.count(*) filter (where txn.transfer_direction = 'IN')
  into transfer_count, out_count, in_count
  from public.transactions as txn
  where txn.user_id = current_user_id
    and txn.type = 'TRANSFER'
    and txn.transfer_group_id = p_transfer_group_id;

  if transfer_count <> 2 or out_count <> 1 or in_count <> 1 then
    raise exception 'The transfer does not exist or is incomplete.'
      using errcode = 'P0002';
  end if;

  delete from public.transactions as txn
  where txn.user_id = current_user_id
    and txn.type = 'TRANSFER'
    and txn.transfer_group_id = p_transfer_group_id;
end;
$$;

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
  ) as current_balance
from public.accounts as account
left join public.transactions as txn
  on txn.user_id = account.user_id
  and txn.account_id = account.id
group by account.id;

create or replace view public.transaction_history
with (security_invoker = true)
as
select
  txn.id as transaction_id,
  txn.user_id,
  txn.type,
  txn.amount,
  txn.description,
  txn.transaction_date,
  txn.category_id,
  category.name as category_name,
  txn.account_id,
  account.name as account_name,
  null::uuid as transfer_group_id,
  null::uuid as from_account_id,
  null::text as from_account_name,
  null::uuid as to_account_id,
  null::text as to_account_name
from public.transactions as txn
left join public.accounts as account
  on account.user_id = txn.user_id
  and account.id = txn.account_id
left join public.categories as category
  on category.id = txn.category_id
where txn.type in ('INCOME', 'EXPENSE')

union all

select
  transfer_out.transfer_group_id as transaction_id,
  transfer_out.user_id,
  'TRANSFER'::text as type,
  transfer_out.amount,
  transfer_out.description,
  transfer_out.transaction_date,
  null::uuid as category_id,
  null::text as category_name,
  null::uuid as account_id,
  null::text as account_name,
  transfer_out.transfer_group_id,
  transfer_out.account_id as from_account_id,
  from_account.name as from_account_name,
  transfer_in.account_id as to_account_id,
  to_account.name as to_account_name
from public.transactions as transfer_out
join public.transactions as transfer_in
  on transfer_in.user_id = transfer_out.user_id
  and transfer_in.transfer_group_id = transfer_out.transfer_group_id
  and transfer_in.type = 'TRANSFER'
  and transfer_in.transfer_direction = 'IN'
join public.accounts as from_account
  on from_account.user_id = transfer_out.user_id
  and from_account.id = transfer_out.account_id
join public.accounts as to_account
  on to_account.user_id = transfer_in.user_id
  and to_account.id = transfer_in.account_id
where transfer_out.type = 'TRANSFER'
  and transfer_out.transfer_direction = 'OUT';

revoke all on public.account_balances, public.transaction_history
  from public, anon, authenticated;
grant select on public.account_balances, public.transaction_history
  to authenticated;
revoke insert on table public.transactions from public, anon, authenticated;
revoke insert (
  user_id, account_id, category_id, type, amount, description, transaction_date
) on public.transactions from authenticated;

revoke all on function public.create_transaction(
  uuid, text, uuid, uuid, uuid, numeric, timestamptz, text
) from public, anon, authenticated;
grant execute on function public.create_transaction(
  uuid, text, uuid, uuid, uuid, numeric, timestamptz, text
) to authenticated;
revoke all on function private.validate_transaction_category()
  from public, anon, authenticated;

revoke all on function public.update_transfer(
  uuid, uuid, uuid, numeric, timestamptz, text
) from public, anon, authenticated;
grant execute on function public.update_transfer(
  uuid, uuid, uuid, numeric, timestamptz, text
) to authenticated;

revoke all on function public.delete_transfer(uuid) from public, anon, authenticated;
grant execute on function public.delete_transfer(uuid) to authenticated;

revoke all on function public.create_transfer(
  uuid, uuid, numeric, timestamptz, text
) from public, anon, authenticated;
