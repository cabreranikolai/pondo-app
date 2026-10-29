# Supabase database setup and verification

The initial migration is
[`migrations/20261026070000_initial_pondo_schema.sql`](./migrations/20261026070000_initial_pondo_schema.sql).
The project owner reports that it has been applied to the Supabase project;
this repository has no live database connection to independently verify that.
Do not apply it a second time without checking the project's migration history
and schema first.

## Apply the migration in the Supabase Dashboard

1. Confirm you have selected the intended Supabase project. For a first run,
   use a development project with test data.
2. Open **SQL Editor** and create a new query.
3. Open the migration file above, copy its complete contents into the editor,
   and run it once.
4. Confirm the query completes successfully before continuing. Do not rerun a
   partially failed script blindly; inspect the error and database objects
   first. This migration does not drop or reset existing tables.
5. If using the Supabase CLI later, initialize/link the project and use
   `supabase db push` only after confirming the linked project is the intended
   development project. This repository currently has no `supabase/config.toml`
   and no CLI installed.

The migration requires the Supabase `authenticated` and `anon` roles, the
`auth` schema, and permission to install `pgcrypto` in the `extensions` schema.
The SQL Editor project owner normally has the required privileges. If the
extension is already installed in a different schema, resolve that setup
explicitly before applying the migration rather than changing function
search paths or granting broader privileges.

## First superadmin

The migration intentionally does not promote anyone automatically. First
create a dedicated test user in **Authentication → Users**, then use that
user's profile UUID to promote it from the trusted SQL Editor as the project
owner:

```sql
select id, role
from public.profiles
where id = 'AUTH_USER_UUID';

update public.profiles
set role = 'SUPERADMIN'
where id = 'AUTH_USER_UUID';
```

Confirm exactly the intended test profile changed. This is a privileged,
one-time bootstrap operation. After bootstrap, authenticated role changes
should use the `admin_set_profile_role` function, which requires an existing
superadmin session. Never expose a database-owner or service-role credential
to the browser.

## Verify tables and RLS

Run these queries in SQL Editor:

```sql
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'profiles', 'accounts', 'categories', 'transactions', 'budgets', 'invitations'
  )
order by table_name;
```

Expect six rows.

```sql
select relname as table_name, relrowsecurity as rls_enabled
from pg_class
where oid in (
  'public.profiles'::regclass,
  'public.accounts'::regclass,
  'public.categories'::regclass,
  'public.transactions'::regclass,
  'public.budgets'::regclass,
  'public.invitations'::regclass
)
order by relname;
```

Expect `rls_enabled = true` for every row. The `invitations` table has no
authenticated read policy or table grants; invitation operations go through
restricted functions.

## Test user isolation (test accounts only)

1. Create two test users in **Authentication → Users** and note their auth
   UUIDs. The signup trigger should create a profile with role `END_USER`
   regardless of any client-supplied role metadata.
2. As the trusted SQL Editor owner, create one fake account for each test
   user. Use non-sensitive names and no real financial information:

   ```sql
   insert into public.accounts (user_id, name, account_type)
   values
     ('TEST_USER_A_UUID', 'Test A cash', 'CASH'),
     ('TEST_USER_B_UUID', 'Test B bank', 'BANK');
   ```

3. Simulate a user's JWT claims in a SQL Editor transaction. Replace the UUID
   in both settings with test user A's UUID:

   ```sql
   begin;
   set local role authenticated;
   select set_config('request.jwt.claim.sub', 'TEST_USER_A_UUID', true);
   select set_config(
     'request.jwt.claims',
     '{"sub":"TEST_USER_A_UUID","role":"authenticated"}',
     true
   );
   select user_id, name from public.accounts order by name;
   rollback;
   ```

   Only user A's test account should be visible. Repeat with user B's UUID and
   confirm only B's row is visible. If SQL Editor does not permit `SET LOCAL
   ROLE authenticated`, perform the same read tests through the Supabase API
   using each test user's own session and the public anon/publishable key.
   Never use a service-role key for these tests.

4. While simulating an ordinary test user, attempt to insert an account with
   the other user's UUID as `user_id`. It must fail the RLS `WITH CHECK`
   policy. Roll back the test transaction.

5. Seed test B with a custom category, transaction, and budget using the
   trusted SQL Editor (plus a category/account pair those records reference).
   Then repeat the authenticated test as user A for each of `categories`,
   `transactions`, and `budgets`: SELECT B's rows (expect zero rows), UPDATE
   B's rows (expect zero affected rows), and DELETE B's rows (expect zero
   affected rows). Try INSERT with `user_id = 'TEST_USER_B_UUID'` (expect an
   RLS error). Also try setting `user_id` to B's UUID on an existing A row;
   the column grant should reject the update. Use only fake records and roll
   back test transactions.

6. Repeat reads as `anon` (or call the API without an access token). Private
   tables should return permission errors/zero rows; do not treat a zero-row
   result alone as proof if the API response also contains an error. System
   categories are the intentional public-to-authenticated exception, but
   anonymous users have no table grant.

## Verify role protections and superadmin isolation

1. Promote test user A to `SUPERADMIN` using the one-time SQL Editor bootstrap
   above. Leave test user B as `END_USER`.
2. Simulate user A's authenticated claims and query
   `select count(*) from public.accounts where user_id = 'TEST_USER_B_UUID';`.
   It must return `0`; a superadmin does not receive a financial-data bypass.
3. Simulate ordinary user B and try:

   ```sql
   update public.profiles
   set role = 'SUPERADMIN'
   where id = 'TEST_USER_B_UUID';
   ```

   The role-column update must be rejected due to the restricted column
   grants. If the SQL Editor stops on the expected permission error, that is
   the expected result; verify the profile still has `END_USER` using the
   trusted SQL Editor afterward.
4. As user B, call `admin_set_profile_role` through the API. It must fail
   because the function checks the caller's profile role. As user A, test
   role administration only on test profiles.
5. Confirm user B cannot select from `public.invitations`. Invitation creation
   returns a raw one-time token only to an authenticated superadmin;
   the database stores only its SHA-256 hash. The client cannot list invitation
   rows or call `admin_list_invitations`. Do not paste or log returned tokens.

The SQL Editor impersonation steps are controlled tests, not substitutes for
end-to-end API tests. Record the project, test UUIDs, and observed outcomes
locally; do not share keys, tokens, or private records.

## Schema behavior and current limits

- Transaction dates use `timestamptz` and are stored as instants; clients
  should send ISO-8601 timestamps with an explicit timezone.
- User-owned account/category relationships are checked in the database.
  Category validation enforces income/expense type compatibility.
- System categories are readable but not writable by app users. Custom
  category type is fixed after creation.
- A transfer is two `TRANSFER` ledger rows with the same group UUID and
  opposite `OUT`/`IN` directions. Create it only through
  `public.create_transfer`; the function checks both account owners and writes
  both rows atomically. It currently requires both accounts to use the same
  currency. App users cannot directly insert, update, or delete transfer rows.
- The database creation function returns a raw one-time token only to its
  authorized caller. The Step 4 Edge Function source sends it through a
  server-side mail workflow and must be deployed before invitation email
  delivery is available. Acceptance requires an authenticated user with a
  confirmed email matching the normalized invitation email.
- No authentication UI, financial UI, or database integration workflow is
  implemented by the schema migration alone. Complete the application-level
  configuration and verification below before using the auth flows.

## Step 4: Authentication and invitation setup

The app uses the existing public Vite variables `VITE_SUPABASE_URL` and
`VITE_SUPABASE_ANON_KEY`. The browser uses only the public anon/publishable
key. Never add a service-role key, secret key, or database password to a
`VITE_` variable.

In the Supabase Dashboard:

1. Under **Authentication → Settings → User Signups**, enable **Allow new
   users to sign up**. The registration form is public; Supabase enforces its
   configured confirmation policy.
2. Open **Authentication → URL Configuration**. Set the site URL to the
   deployed app origin. Add these exact redirect destinations to the allowed
   redirect URLs for local development and production:
   - `http://localhost:5173/auth/callback`
   - `http://localhost:5173/reset-password`
   - `https://YOUR_APP_HOST/auth/callback`
   - `https://YOUR_APP_HOST/reset-password`
3. Under **Authentication → Providers → Email**, enable Email/Password and
   choose whether email confirmation is required. Configure the confirmation
   template so its action link returns to the requested redirect URL (do not
   hardcode an unapproved host). The recovery template should likewise use
   Supabase's recovery action link. The app uses `/auth/callback` for signup
   confirmation and `/reset-password` for recovery.
4. Configure SMTP under **Project Settings → Authentication → SMTP Settings**
   (or the current Dashboard's SMTP settings). Use a verified sending domain,
   valid sender, and provider credentials stored only in Supabase. The
   built-in email service is suitable for limited testing and may have
   delivery/rate limits. The app reports that Supabase accepted an email
   request; this does not prove inbox delivery.
5. Set the Supabase minimum password length to at least 12 characters to
   match the client-side rule. The backend remains the authority for the
   project password policy.
6. Verify the existing signup profile trigger and RLS policies using the
   test steps above. Registration never submits a role, and the trigger always
   inserts `END_USER`.

The profile is created once by the `auth.users` trigger using `ON CONFLICT
(id) DO NOTHING`. The profile row is the user's identity in their personal
workspace; financial records use the same Auth UUID as `user_id`. No separate
workspace table or client-side initialization write is required.

The frontend supports requesting a confirmation email again from registration
success or from login after an unconfirmed-email response. If Supabase returns
an error, the UI reports failure rather than claiming a request succeeded.

### Invitation listing lockdown migration

The migration
[`migrations/20261026100000_restrict_invitation_listing.sql`](./migrations/20261026100000_restrict_invitation_listing.sql)
revokes execution of `admin_list_invitations()` from `PUBLIC`, `anon`, and
`authenticated`; the frontend does not display an invitation directory.
Apply this follow-up migration in SQL Editor after confirming the initial
migration exists. For a new project, apply the initial migration and then this
follow-up in timestamp order. To reverse this restriction as a trusted project
owner, run:

```sql
grant execute on function public.admin_list_invitations() to authenticated;
```

Do not grant it back unless invitation-list access is explicitly required and
reviewed. Existing invite creation remains a superadmin-only operation through
the Edge Function and restricted RPC.

### Deploy the invitation mail function

`supabase/functions/send-invitation/index.ts` uses the signed-in user's
session to call the existing, superadmin-checked `admin_create_invitation`
RPC. It sends the one-time invitation link through Resend and never returns
the raw token to the browser. If email delivery fails, the function attempts
to revoke the pending invite and reports if administrator review may still be
needed. The token is delivered only in the invitation email and is accepted
only for a confirmed account whose email matches the invitation.

The function is not deployed by committing the source. After installing and
linking the Supabase CLI to the intended project:

1. Verify the linked project before deployment. Set function secrets in the
   Dashboard under **Edge Functions → Secrets** (or with the CLI secrets
   command):
   - `RESEND_API_KEY`: Resend API key with permission to send from the
     verified sender.
   - `INVITATION_FROM_EMAIL`: verified sender, for example
     `Pondo <invites@YOUR_VERIFIED_DOMAIN>`.
   - `APP_URL`: exact application origin, such as `http://localhost:5173`
     during local development, or the production origin.
   `SUPABASE_URL` and `SUPABASE_ANON_KEY` are provided to Supabase Edge
   Functions by the platform. Do not put these values in browser source.
2. Deploy with the Edge Function JWT verification enabled (the default):

   ```sh
   supabase functions deploy send-invitation --project-ref YOUR_PROJECT_REF
   ```

3. Keep the default JWT verification enabled. The function additionally
   validates the caller's Supabase session, and its RPC independently checks
   the caller's superadmin profile. It accepts only an email address; no
   invitation role is accepted from the browser.
4. Confirm the app origin is allowed by `APP_URL` and the invitation link
   resolves to `/register`. Configure Supabase Auth's allowed redirect URL for
   `/auth/callback` as above so email verification can return to the app.
5. Test with a dedicated superadmin and a test recipient mailbox. Confirm the
   recipient receives the invite, registration/verification works, the
   invitation shows accepted, and an ordinary end user cannot invoke the
   superadmin RPCs. The invitation UI deliberately reports the feature as
   unavailable if the Edge Function is missing.

The app's auth and user-management code can be built locally, but live signup,
verification, reset-email delivery, Edge Function deployment, and role/RLS
behavior require manual testing against the intended Supabase project. The
presence of the code or the successful frontend build is not evidence those
remote services are configured correctly.

## Step 5: Accounts and opening balances

The account page uses `public.accounts` with its existing per-user RLS
policies. It explicitly filters by the signed-in Auth UUID, and inserts that
same UUID as `user_id`; the RLS `WITH CHECK` policy remains the actual security
boundary. The existing migration stores `opening_balance` as
`numeric(14,2)`, and the UI keeps decimal values as strings/cents rather than
using floating-point arithmetic for totals.

The original account schema did not include `OTHER` or an archive field. Apply
[`migrations/20261026110000_accounts_archive_and_other_type.sql`](./migrations/20261026110000_accounts_archive_and_other_type.sql)
after checking the project's migration history. It is additive: adds
`is_archived` defaulting to false, expands the account type check constraint,
and adds an index. It does not drop account or transaction rows. It also
revokes direct account deletion in favor of archive/restore, and installs a
trigger that prevents future transaction inserts or account changes from
referencing archived accounts. Existing transaction history remains attached
to archived accounts.

After applying, verify:

```sql
select column_name, data_type, numeric_precision, numeric_scale
from information_schema.columns
where table_schema = 'public'
  and table_name = 'accounts'
  and column_name in ('opening_balance', 'is_archived', 'account_type')
order by column_name;

select relrowsecurity
from pg_class
where oid = 'public.accounts'::regclass;

select has_table_privilege('authenticated', 'public.accounts', 'DELETE')
  as authenticated_can_delete_accounts;
```

Expect `opening_balance` to be numeric precision 14 / scale 2,
`is_archived` to be boolean, RLS enabled, and authenticated delete privilege
false.

The Accounts page shows database-calculated current balances from opening
balances and posted transactions. Archived accounts are excluded from active
totals and can be restored explicitly.
Use two signed-in test accounts to verify that one account cannot select,
edit, archive, restore, or delete the other user's rows. Also try an
unauthenticated API request; no account rows should be readable or writable.

## Step 6: Transactions and balances

Apply migrations in this order, after confirming which migrations are already
recorded for the selected Supabase project:

1. [`migrations/20261026110000_accounts_archive_and_other_type.sql`](./migrations/20261026110000_accounts_archive_and_other_type.sql)
2. [`migrations/20261026130000_transaction_history_and_atomic_writes.sql`](./migrations/20261026130000_transaction_history_and_atomic_writes.sql)

The Step 6 migration stops with an explicit error if the account archive
column from Step 5 is missing. It does not recreate or drop application tables.
Apply each migration once; if a SQL Editor run fails part-way, inspect the
database objects and the error before retrying it.

The transaction page reads the `transaction_history` security-invoker view,
which combines transfer-out and transfer-in legs into one history row.
`account_balances` derives exact numeric balances in PostgreSQL from each
account's opening balance and its income, expense, and transfer legs.
Transfers add to the receiving account and subtract from the sending account;
they do not affect income or expense totals. Archived accounts retain their
history and balance, but are excluded from active-account totals and cannot
receive new transactions.

New records go through `public.create_transaction`, which checks the
authenticated owner, active account ownership, category type/ownership,
positive two-decimal amounts, and matching transfer currency. It writes both
transfer legs in one database transaction and uses a per-user request ID to
make retries of the same create request idempotent. Direct authenticated
transaction INSERT privileges are revoked. Transfer edits and deletes use
restricted RPCs that change/remove both legs atomically; ordinary
income/expense edits and deletes remain protected by the existing RLS policies.
No migration was applied by the frontend build.

After applying both migrations, verify the views, RLS, and transaction grants
in SQL Editor:

```sql
select table_name
from information_schema.views
where table_schema = 'public'
  and table_name in ('account_balances', 'transaction_history')
order by table_name;

select relname as table_name, relrowsecurity as rls_enabled
from pg_class
where oid in (
  'public.accounts'::regclass,
  'public.categories'::regclass,
  'public.transactions'::regclass
)
order by relname;

select has_any_column_privilege(
  'authenticated', 'public.transactions', 'INSERT'
) as authenticated_can_insert_transaction_directly;

select has_function_privilege(
  'authenticated',
  'public.create_transaction(uuid,text,uuid,uuid,uuid,numeric,timestamptz,text)',
  'EXECUTE'
) as authenticated_can_create_through_rpc;
```

Expect both views to be listed, RLS enabled for all three tables,
`authenticated_can_insert_transaction_directly = false`, and
`authenticated_can_create_through_rpc = true`.

For isolation and integrity tests, use two dedicated test accounts and fake
financial data:

1. As User A, create an account, income, expense, and a transfer between two
   of User A's active accounts. Verify the paired transfer appears once and
   the account balances change by opposite amounts.
2. As User B, verify the history and account balances show only User B's data.
   Attempting to select/update/delete User A's transaction IDs must affect no
   User A rows. Try supplying User A's account/category IDs to the create RPC;
   it must reject the request.
3. As User A, edit and delete each transaction type. Confirm a transfer's two
   legs change or disappear together and that transfers do not alter income or
   expense amounts.
4. Retry a create request using the same request UUID and identical fields;
   it must return the original operation rather than create a duplicate.
   Reuse that UUID with different fields; it must be rejected.
5. Archive an account and try creating a transaction or moving a transfer leg
   to it. New activity must be rejected; existing history and balances must
   remain available.
6. Make unauthenticated requests to the views and RPCs; private records and
   writes must remain inaccessible.

These live database and two-user checks must be performed in the intended
Supabase project. A successful local lint/build does not verify database
policies, grants, RPC behavior, or account isolation.

## Step 7: Budgets and financial reports

The Step 7 migration is
[`migrations/20261027080000_budget_reports_support.sql`](./migrations/20261027080000_budget_reports_support.sql).
Apply it after the initial schema migration and the Step 6 transaction
migration. It is additive: it permits `category_id = NULL` for an overall
monthly budget, adds a partial unique index so each user can have only one
overall budget per month, and updates the category validation trigger to
accept that overall-budget case. Existing category-budget uniqueness,
budget ownership RLS policies, and foreign keys remain in place.

The migration also adds `public.get_financial_report`, a stable
`SECURITY INVOKER` function that aggregates only the authenticated user's
`INCOME` and `EXPENSE` transactions into local-calendar month/category rows.
It returns exact numeric sums as text. Transfers are excluded. The function
is granted only to `authenticated`, and underlying transaction/category RLS
continues to apply. Dashboard, budgets, and reports use this function rather
than downloading unbounded transaction rows or calculating authoritative
financial totals in the browser.

The UI interprets the selected month in the device's IANA timezone and sends
its local month boundaries to the report function. Overall budget spending
counts all expenses once; category budgets use only their own category.
The dashboard/report utilization uses the explicit overall budget when one
exists, otherwise it reports utilization of the individually budgeted
categories only. It does not sum those categories together with an overall
budget. When displayed together on the Budgets page, the overall and
category cards are separate measures, not additive totals.

Apply the Step 7 migration once, after confirming the prior migration history.
For SQL Editor verification, check the overall uniqueness index, budget RLS,
and report RPC permissions:

```sql
select indexname, indexdef
from pg_indexes
where schemaname = 'public'
  and tablename = 'budgets'
  and indexname = 'budgets_user_month_overall_key';

select relrowsecurity
from pg_class
where oid = 'public.budgets'::regclass;

select has_function_privilege(
  'authenticated',
  'public.get_financial_report(timestamptz,timestamptz,text)',
  'EXECUTE'
) as authenticated_can_read_own_report,
has_function_privilege(
  'anon',
  'public.get_financial_report(timestamptz,timestamptz,text)',
  'EXECUTE'
) as anon_can_read_report;
```

Expect the partial index to be present, RLS enabled, authenticated execution
true, and anon execution false. With two test accounts, create separate fake
income, expenses, category budgets, and overall budgets. Verify that each
user's report and budget queries contain only their rows, that transfers do
not affect report totals, that local month boundaries classify transactions
as expected, and that duplicate overall/category budgets for a user and month
are rejected. These live database and isolation tests have not been performed
by the frontend build.

## First-login onboarding

Apply
[`migrations/20261027090000_onboarding_progress.sql`](./migrations/20261027090000_onboarding_progress.sql)
after the initial schema migration. It adds a separate
`public.onboarding_progress` table instead of extending `profiles`, since
profile read policies allow superadmins to read other profiles. The new table
has RLS enabled and grants authenticated users access only to their own row.
The browser can insert its own initial row and update tutorial status, current
step, and checklist dismissal; it cannot change the user ID or version. No
financial records are created by onboarding.

The UI shows the welcome screen only after session and profile loading have
completed. Tutorial progress is stored per user and resumes at its last saved
step. Completion and skipping are persisted, while the optional setup
checklist checks actual account, transaction, and budget rows under the user's
RLS policies. Settings has controls to replay the tour or show the checklist.
Apply the migration once, after checking the project's migration history.

Verify ownership in SQL Editor:

```sql
select relrowsecurity
from pg_class
where oid = 'public.onboarding_progress'::regclass;

select policyname, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename = 'onboarding_progress'
order by policyname;

select has_table_privilege(
  'authenticated', 'public.onboarding_progress', 'SELECT'
) as authenticated_can_select_onboarding;
```

RLS should be enabled. As two different authenticated test users, create/read
their own progress and verify selecting or updating the other user's UUID
returns no rows. The migration and frontend build alone do not prove live
cross-user isolation or multi-device persistence; verify those against the
intended Supabase project.

## Philippine bank account metadata

The local account form suggests names from the BSP's
[Directory of Banks and Non-Bank Financial Institutions](https://www.bsp.gov.ph/SitePages/FinancialStability/DirBanksFIList.aspx),
specifically its Universal & Commercial Banks and Digital Banks listings.
This list was reviewed against the BSP directory on 26 October 2026. It is a
bundled suggestion list, not a live API, and users can enter a bank that is not
listed. When `VITE_LOGO_DEV_KEY` contains a public, browser-safe Logo.dev key,
the app loads logos by the configured bank domains. Vite exposes this variable
in the browser bundle, so never use a secret or server-side key. Without a key
or when a logo cannot be loaded, the app displays a neutral bank icon. Review
the domain mappings in `src/lib/bankDomains.js` before enabling the service.

Apply
[`migrations/20261027100000_philippine_bank_metadata.sql`](./migrations/20261027100000_philippine_bank_metadata.sql)
after the account archive and transaction-history migrations. It adds nullable
`accounts.bank_name`, grants authenticated users insert/update access to that
column only, and appends the value to the security-invoker `account_balances`
view. Existing ownership RLS policies and all other column grants remain
unchanged. Check migration history before applying it, and do not rerun it
blindly.

## E-wallet account metadata

The account form offers optional e-wallet provider suggestions for GCash, Maya,
GrabPay, ShopeePay, Coins.ph, PalawanPay, and DiskarTech. The provider names
are bundled in the app and can be entered manually when a provider is not
listed. Logos use the same optional public Logo.dev key and domain-restricted
client-side configuration described above; a neutral wallet icon is shown
when no logo key is set or an image is unavailable.

Apply
[`migrations/20261029110000_ewallet_provider_metadata.sql`](./migrations/20261029110000_ewallet_provider_metadata.sql)
after the preceding migrations, including the Philippine bank account metadata
and savings goals migrations. It adds nullable
`accounts.e_wallet_provider`, grants authenticated users access to that column
only, and appends it to the security-invoker `account_balances` view. Existing
account ownership policies and other column grants remain unchanged. As with
other migrations, check the project migration history before applying it.

## Savings goals

Apply
[`migrations/20261029100000_savings_goals.sql`](./migrations/20261029100000_savings_goals.sql)
after the existing schema migrations. It creates `public.savings_goals` with
per-user row-level security, positive target validation, and separate saved
amount tracking. The `adjust_savings_goal` RPC adds or withdraws progress
atomically, rejects withdrawals larger than the saved amount, and is executable
only by authenticated users. Goal progress does not create transactions or
change account balances.

Verify RLS and RPC permissions in SQL Editor:

```sql
select relrowsecurity
from pg_class
where oid = 'public.savings_goals'::regclass;

select has_function_privilege(
  'authenticated',
  'public.adjust_savings_goal(uuid,numeric,text)',
  'EXECUTE'
) as authenticated_can_adjust_goals,
has_function_privilege(
  'anon',
  'public.adjust_savings_goal(uuid,numeric,text)',
  'EXECUTE'
) as anon_can_adjust_goals;
```

Expect RLS enabled, authenticated execution true, and anon execution false.
Using two test users, verify each can only list and change their own goals,
including that the RPC cannot adjust another user's goal.
