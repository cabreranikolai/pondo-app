import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Archive,
  ArchiveRestore,
  Banknote,
  Building2,
  Check,
  ChevronDown,
  CircleAlert,
  Pencil,
  Plus,
  Search,
  Smartphone,
  WalletCards,
  X,
} from 'lucide-react'
import { useAuth } from '../contexts/authContext.js'
import EmptyState from '../components/ui/EmptyState.jsx'
import FinancialProviderLogo from '../components/ui/FinancialProviderLogo.jsx'
import ConfirmDialog from '../components/ui/ConfirmDialog.jsx'
import PageHeader from '../components/ui/PageHeader.jsx'
import { centsToDecimal, formatCents, toCents } from '../lib/money.js'
import { PHILIPPINE_BANKS } from '../lib/philippineBanks.js'
import { PHILIPPINE_E_WALLETS } from '../lib/philippineEWallets.js'
import { supabase } from '../lib/supabase.js'

const ACCOUNT_TYPES = [
  { value: 'CASH', label: 'Cash' },
  { value: 'BANK', label: 'Bank' },
  { value: 'E_WALLET', label: 'E-wallet' },
  { value: 'OTHER', label: 'Other' },
]

const TYPE_ICONS = {
  CASH: Banknote,
  BANK: Building2,
  E_WALLET: Smartphone,
  OTHER: WalletCards,
}

const EMPTY_FORM = {
  name: '',
  account_type: 'CASH',
  bank_name: '',
  e_wallet_provider: '',
  opening_balance: '0.00',
}

function accountLoadError(error) {
  const details = [
    error?.code,
    error?.message,
    error?.details,
    error?.hint,
  ].join(' ').toLowerCase()

  if (details.includes('is_archived')) {
    return 'The account archive database update is missing. Apply 20261026110000_accounts_archive_and_other_type.sql in Supabase, then retry.'
  }
  if (details.includes('bank_name')) {
    return 'The bank details database update is missing. Apply 20261027100000_philippine_bank_metadata.sql in Supabase, then retry.'
  }
  if (details.includes('e_wallet_provider')) {
    return 'The e-wallet details database update is missing. Apply 20261029110000_ewallet_provider_metadata.sql in Supabase, then retry.'
  }
  if (details.includes('account_balances') || details.includes('current_balance')) {
    return 'The account balance view is missing. Apply 20261026110000_accounts_archive_and_other_type.sql, then 20261026130000_transaction_history_and_atomic_writes.sql in Supabase, then retry.'
  }
  return 'Unable to load accounts. Check your connection and try again.'
}

function accountTypeLabel(type) {
  return ACCOUNT_TYPES.find((item) => item.value === type)?.label || 'Other'
}

function ProviderCombobox({ value, onChange, providers, providerType, inputId, label }) {
  const [isOpen, setIsOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const listId = `${inputId}-options`
  const optionIdPrefix = `${inputId}-option`
  const matchingProviders = useMemo(() => {
    const query = value.trim().toLocaleLowerCase()
    if (!query) return providers
    return providers.filter((provider) =>
      provider.toLocaleLowerCase().includes(query),
    )
  }, [providers, value])

  function chooseProvider(provider) {
    onChange(provider)
    setIsOpen(false)
    setActiveIndex(0)
  }

  function handleKeyDown(event) {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setIsOpen(true)
      setActiveIndex((index) =>
        matchingProviders.length
          ? index < 0
            ? 0
            : (index + 1) % matchingProviders.length
          : -1,
      )
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setIsOpen(true)
      setActiveIndex((index) =>
        matchingProviders.length
          ? index < 0 || index === 0
            ? matchingProviders.length - 1
            : index - 1
          : -1,
      )
    } else if (event.key === 'Enter' && isOpen && matchingProviders[activeIndex]) {
      event.preventDefault()
      chooseProvider(matchingProviders[activeIndex])
    } else if (event.key === 'Escape' && isOpen) {
      event.preventDefault()
      setIsOpen(false)
    }
  }

  return (
    <div
      className="relative"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setIsOpen(false)
      }}
    >
      <div className="flex min-h-11 items-center rounded-lg border border-line bg-white focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/15">
        <Search aria-hidden="true" size={17} className="ml-3 shrink-0 text-muted" />
        <input
          id={inputId}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={isOpen}
          aria-controls={listId}
          aria-activedescendant={
            isOpen && matchingProviders[activeIndex]
              ? `${optionIdPrefix}-${activeIndex}`
              : undefined
          }
          autoComplete="off"
          maxLength={120}
          value={value}
          onFocus={() => setIsOpen(true)}
          onChange={(event) => {
            onChange(event.target.value)
            setActiveIndex(-1)
            setIsOpen(true)
          }}
          onKeyDown={handleKeyDown}
          placeholder={`Search or enter a ${label.toLowerCase()}`}
          className="min-w-0 flex-1 bg-transparent px-2 text-sm text-ink outline-none placeholder:text-muted"
        />
        <button
          type="button"
          aria-label={
            isOpen
              ? `Close ${label.toLowerCase()} suggestions`
              : `Show ${label.toLowerCase()} suggestions`
          }
          aria-expanded={isOpen}
          onClick={() => {
            setIsOpen((open) => !open)
            setActiveIndex(-1)
          }}
          className="grid size-10 shrink-0 place-items-center rounded-r-lg text-muted hover:bg-canvas"
        >
          <ChevronDown
            aria-hidden="true"
            size={17}
            className={`transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`}
          />
        </button>
      </div>

      {isOpen && (
        <div className="absolute inset-x-0 top-full z-20 mt-1 overflow-hidden rounded-xl border border-line bg-white shadow-lg">
          <p className="border-b border-line px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted">
            {label}
          </p>
          <ul
            id={listId}
            role="listbox"
            aria-label={`${label} suggestions`}
            className="max-h-52 overflow-y-auto overscroll-contain p-1"
          >
            {matchingProviders.length ? (
              matchingProviders.map((provider, index) => (
                <li key={provider} role="presentation">
                  <div
                    id={`${optionIdPrefix}-${index}`}
                    role="option"
                    aria-selected={value === provider}
                    onMouseDown={(event) => event.preventDefault()}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => chooseProvider(provider)}
                    className={`flex min-h-10 w-full cursor-pointer items-center gap-2 rounded-lg px-2.5 text-left text-sm transition-colors ${
                      activeIndex === index
                        ? 'bg-brand-soft text-brand'
                        : 'text-ink hover:bg-canvas'
                    }`}
                  >
                    <FinancialProviderLogo
                      providerName={provider}
                      providerType={providerType}
                      className="size-8"
                    />
                    <span className="min-w-0 flex-1">{provider}</span>
                    {value === provider && (
                      <Check aria-hidden="true" size={16} className="shrink-0 text-brand" />
                    )}
                  </div>
                </li>
              ))
            ) : (
              <li className="px-3 py-3 text-sm text-muted">
                No matching provider. Your entry will be saved as typed.
              </li>
            )}
          </ul>
          <p className="border-t border-line px-3 py-2 text-xs text-muted">
            You can also enter a provider not listed here.
          </p>
        </div>
      )}
    </div>
  )
}

function AccountForm({ account, busy, error, onCancel, onSubmit }) {
  const [form, setForm] = useState(
    account
      ? {
          name: account.name,
          account_type: account.account_type,
          bank_name: account.bank_name || '',
          e_wallet_provider: account.e_wallet_provider || '',
          opening_balance: String(account.opening_balance ?? '0.00'),
        }
      : EMPTY_FORM,
  )
  const [validationError, setValidationError] = useState('')

  function updateField(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
      ...(field === 'account_type' && value !== 'BANK' ? { bank_name: '' } : {}),
      ...(field === 'account_type' && value !== 'E_WALLET'
        ? { e_wallet_provider: '' }
        : {}),
    }))
    setValidationError('')
  }

  function handleSubmit(event) {
    event.preventDefault()
    const name = form.name.trim()
    if (!name) {
      setValidationError('Enter an account name.')
      return
    }
    if (name.length > 80) {
      setValidationError('Account name must be 80 characters or fewer.')
      return
    }

    const bankName = form.bank_name.trim()
    if (form.account_type === 'BANK' && bankName.length > 120) {
      setValidationError('Bank name must be 120 characters or fewer.')
      return
    }
    const eWalletProvider = form.e_wallet_provider.trim()
    if (form.account_type === 'E_WALLET' && eWalletProvider.length > 120) {
      setValidationError('E-wallet provider name must be 120 characters or fewer.')
      return
    }

    const openingBalanceCents = toCents(form.opening_balance)
    if (openingBalanceCents === null) {
      setValidationError(
        'Enter a valid amount with up to 12 whole digits and 2 decimal places.',
      )
      return
    }

    onSubmit({
      name,
      account_type: form.account_type,
      bank_name: form.account_type === 'BANK' ? bankName || null : null,
      e_wallet_provider:
        form.account_type === 'E_WALLET' ? eWalletProvider || null : null,
      opening_balance: centsToDecimal(openingBalanceCents),
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] sm:items-center sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onCancel()
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="account-form-title"
        className="max-h-[88dvh] w-full overflow-y-auto overscroll-contain rounded-2xl bg-white p-4 shadow-xl sm:max-h-[92vh] sm:max-w-lg sm:p-7"
      >
        <div className="mb-3 flex items-start justify-between gap-3 sm:mb-5 sm:gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand">
              Your money
            </p>
            <h2 id="account-form-title" className="mt-1 text-xl font-semibold text-ink">
              {account ? 'Edit account' : 'Add account'}
            </h2>
            <p className="mt-1 text-sm leading-5 text-muted">
              {account
                ? 'Update the account details and starting balance.'
                : 'Add a place where you keep or track your money.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            aria-label="Close account form"
            className="grid size-9 shrink-0 place-items-center rounded-lg text-muted hover:bg-canvas disabled:opacity-50"
          >
            <X aria-hidden="true" size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
          <div>
            <label htmlFor="account-name" className="mb-1.5 block text-sm font-medium text-ink">
              Account name
            </label>
            <input
              id="account-name"
              autoFocus
              autoComplete="off"
              maxLength={80}
              required
              value={form.name}
              onChange={(event) => updateField('name', event.target.value)}
              placeholder="e.g. BDO Savings"
              className="min-h-11 w-full rounded-lg border border-line bg-white px-3 text-sm text-ink outline-none placeholder:text-muted focus:border-brand focus:ring-2 focus:ring-brand/15"
            />
          </div>

          <div>
            <label htmlFor="account-type" className="mb-1.5 block text-sm font-medium text-ink">
              Account type
            </label>
            <select
              id="account-type"
              value={form.account_type}
              onChange={(event) => updateField('account_type', event.target.value)}
              className="min-h-11 w-full rounded-lg border border-line bg-white px-3 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/15"
            >
              {ACCOUNT_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          {form.account_type === 'BANK' && (
            <div>
              <label
                htmlFor="account-bank-name"
                className="mb-1.5 block text-sm font-medium text-ink"
              >
                Bank name <span className="font-normal text-muted">(optional)</span>
              </label>
              <ProviderCombobox
                value={form.bank_name}
                onChange={(value) => updateField('bank_name', value)}
                providers={PHILIPPINE_BANKS}
                providerType="BANK"
                inputId="account-bank-name"
                label="Banks in the BSP directory"
              />
              <p className="mt-1.5 text-xs leading-5 text-muted">
                Suggestions include BSP-listed universal, commercial, and digital banks. You can
                also enter another bank.
              </p>
            </div>
          )}

          {form.account_type === 'E_WALLET' && (
            <div>
              <label
                htmlFor="account-e-wallet-provider"
                className="mb-1.5 block text-sm font-medium text-ink"
              >
                E-wallet provider <span className="font-normal text-muted">(optional)</span>
              </label>
              <ProviderCombobox
                value={form.e_wallet_provider}
                onChange={(value) => updateField('e_wallet_provider', value)}
                providers={PHILIPPINE_E_WALLETS}
                providerType="E_WALLET"
                inputId="account-e-wallet-provider"
                label="Popular Philippine e-wallets"
              />
              <p className="mt-1.5 text-xs leading-5 text-muted">
                Choose a provider for its logo, or enter another e-wallet name.
              </p>
            </div>
          )}

          <div>
            <label
              htmlFor="account-opening-balance"
              className="mb-1.5 block text-sm font-medium text-ink"
            >
              Opening balance
            </label>
            <div className="flex min-h-11 items-center rounded-lg border border-line bg-white focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/15">
              <span className="pl-3 text-sm text-muted">₱</span>
              <input
                id="account-opening-balance"
                inputMode="decimal"
                autoComplete="off"
                value={form.opening_balance}
                onChange={(event) => updateField('opening_balance', event.target.value)}
                aria-describedby="opening-balance-help"
                className="min-w-0 flex-1 bg-transparent px-2 text-sm text-ink outline-none"
              />
              <span className="pr-3 text-xs text-muted">PHP</span>
            </div>
            <p id="opening-balance-help" className="mt-1.5 text-xs leading-5 text-muted">
              Starting amount for this account. You can enter up to 2 decimal places.
            </p>
          </div>

          {(validationError || error) && (
            <p className="rounded-lg bg-danger-soft px-3 py-2.5 text-sm text-danger" role="alert">
              {validationError || error}
            </p>
          )}

          <div className="flex gap-2 pt-1 sm:justify-end">
            <button
              type="button"
              onClick={onCancel}
              disabled={busy}
              className="min-h-11 flex-1 rounded-lg border border-line px-3 text-sm font-medium text-muted hover:bg-canvas disabled:opacity-50 sm:flex-none sm:px-4"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="min-h-11 flex-1 rounded-lg bg-brand px-3 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:cursor-wait disabled:opacity-60 sm:flex-none sm:px-4"
            >
              {busy ? 'Saving…' : account ? 'Save changes' : 'Add account'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}

export default function Accounts() {
  const { user } = useAuth()
  const userId = user?.id
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [pageError, setPageError] = useState('')
  const [success, setSuccess] = useState('')
  const [typeFilter, setTypeFilter] = useState('ALL')
  const [showArchived, setShowArchived] = useState(false)
  const [editingAccount, setEditingAccount] = useState(null)
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)
  const [actionAccountId, setActionAccountId] = useState('')
  const [pendingArchiveAccount, setPendingArchiveAccount] = useState(null)

  const loadAccounts = useCallback(async () => {
    if (!userId) {
      setAccounts([])
      setLoading(false)
      return
    }

    const { data, error } = await supabase
      .from('account_balances')
      .select('id, name, account_type, opening_balance, current_balance, currency, is_archived, created_at, bank_name, e_wallet_provider')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })

    if (error) {
      setAccounts([])
      setPageError(accountLoadError(error))
    } else {
      setAccounts(data || [])
      setPageError('')
    }
    setLoading(false)
  }, [userId])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadAccounts()
    }, 0)
    return () => window.clearTimeout(timer)
  }, [loadAccounts])

  const visibleAccounts = useMemo(
    () =>
      accounts.filter(
        (account) =>
          account.is_archived === showArchived &&
          (typeFilter === 'ALL' || account.account_type === typeFilter),
      ),
    [accounts, showArchived, typeFilter],
  )

  const activeTotalCents = useMemo(
    () =>
      accounts
        .filter((account) => !account.is_archived)
        .reduce((total, account) => total + (toCents(account.current_balance, null) ?? 0n), 0n),
    [accounts],
  )

  async function saveAccount(payload) {
    if (!userId || saving) return
    setSaving(true)
    setFormError('')
    setPageError('')
    setSuccess('')

    try {
      if (editingAccount) {
        const { data, error } = await supabase
          .from('accounts')
          .update(payload)
          .eq('id', editingAccount.id)
          .eq('user_id', userId)
          .select('id')
          .maybeSingle()

        if (error) throw error
        if (!data) throw new Error('No account was updated.')
        setSuccess('Account updated.')
      } else {
        const { error } = await supabase.from('accounts').insert({
          ...payload,
          user_id: userId,
          currency: 'PHP',
        })
        if (error) throw error
        setSuccess('Account added.')
      }

      setEditingAccount(null)
      setLoading(true)
      await loadAccounts()
    } catch {
      setFormError(
        'Unable to save this account. Check the details and try again.',
      )
    } finally {
      setSaving(false)
    }
  }

  async function toggleArchived(account) {
    if (!userId || actionAccountId) return
    const nextArchived = !account.is_archived
    setActionAccountId(account.id)
    setPageError('')
    setSuccess('')

    try {
      const { data, error } = await supabase
        .from('accounts')
        .update({ is_archived: nextArchived })
        .eq('id', account.id)
        .eq('user_id', userId)
        .select('id')
        .maybeSingle()

      if (error) throw error
      if (!data) throw new Error('No account was updated.')
      setSuccess(nextArchived ? 'Account archived.' : 'Account restored.')
      setLoading(true)
      await loadAccounts()
    } catch {
      setPageError('Unable to update this account. Check your connection and try again.')
    } finally {
      setActionAccountId('')
    }
  }

  function openCreateForm() {
    setFormError('')
    setEditingAccount(false)
  }

  function openEditForm(account) {
    setFormError('')
    setEditingAccount(account)
  }

  const hasActiveAccounts = accounts.some((account) => !account.is_archived)

  return (
    <>
      <PageHeader
        eyebrow="Your money"
        title="Accounts"
        action={
          <button
            type="button"
            onClick={openCreateForm}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-brand px-4 text-sm font-semibold text-white transition hover:bg-brand-dark"
          >
            <Plus aria-hidden="true" size={17} />
            Add account
          </button>
        }
      />

      {pageError && (
        <div className="mb-5 flex items-start gap-2 rounded-lg bg-danger-soft px-3 py-3 text-sm text-danger" role="alert">
          <CircleAlert aria-hidden="true" className="mt-0.5 shrink-0" size={17} />
          <span>{pageError}</span>
          <button
            type="button"
            onClick={() => {
              setLoading(true)
              loadAccounts()
            }}
            className="ml-auto shrink-0 font-semibold underline"
          >
            Retry
          </button>
        </div>
      )}
      {success && !pageError && (
        <p className="mb-5 rounded-lg bg-brand-soft px-3 py-2.5 text-sm text-brand-dark" role="status">
          {success}
        </p>
      )}

      <section data-tour="accounts-overview" className="mb-6 rounded-xl border border-line bg-white p-5 sm:p-6">
        <p className="text-sm font-medium text-muted">Total balance</p>
        <p className="mt-2 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
          {formatCents(activeTotalCents)}
        </p>
        <p className="mt-2 text-xs leading-5 text-muted">
          Opening balances plus posted transactions · PHP. Transfers between accounts net to zero.
        </p>
      </section>

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2" aria-label="Filter by account type">
          <button
            type="button"
            onClick={() => setTypeFilter('ALL')}
            aria-pressed={typeFilter === 'ALL'}
            className={`min-h-9 rounded-full px-3 text-xs font-medium transition ${
              typeFilter === 'ALL' ? 'bg-brand text-white' : 'border border-line bg-white text-muted'
            }`}
          >
            All types
          </button>
          {ACCOUNT_TYPES.map((type) => (
            <button
              key={type.value}
              type="button"
              onClick={() => setTypeFilter(type.value)}
              aria-pressed={typeFilter === type.value}
              className={`min-h-9 rounded-full px-3 text-xs font-medium transition ${
                typeFilter === type.value
                  ? 'bg-brand text-white'
                  : 'border border-line bg-white text-muted'
              }`}
            >
              {type.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setShowArchived((current) => !current)}
          aria-pressed={showArchived}
          className="inline-flex min-h-10 items-center gap-2 self-start rounded-lg border border-line bg-white px-3 text-sm font-medium text-muted hover:bg-canvas sm:self-auto"
        >
          {showArchived ? <ArchiveRestore aria-hidden="true" size={16} /> : <Archive aria-hidden="true" size={16} />}
          {showArchived ? 'Show active' : 'Show archived'}
        </button>
      </div>

      {loading ? (
        <div className="grid min-h-48 place-items-center rounded-xl border border-line bg-white text-sm text-muted" role="status" aria-live="polite">
          Loading your accounts…
        </div>
      ) : visibleAccounts.length === 0 ? (
        showArchived || hasActiveAccounts ? (
          <EmptyState
            icon={WalletCards}
            title={showArchived ? 'No archived accounts' : 'No accounts match this filter'}
            description={
              showArchived
                ? 'Accounts you archive will remain available here, with their history preserved.'
                : 'Choose another account type to see your active accounts.'
            }
          />
        ) : (
          <div className="space-y-4">
            <EmptyState
              icon={WalletCards}
              title="Start with your first account"
              description="Add a cash wallet, bank account, or e-wallet to begin tracking your balance."
            />
            <div className="flex justify-center">
              <button
                type="button"
                onClick={openCreateForm}
                className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-dark"
              >
                <Plus aria-hidden="true" size={17} />
                Add your first account
              </button>
            </div>
          </div>
        )
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visibleAccounts.map((account) => {
            const Icon = TYPE_ICONS[account.account_type] || WalletCards
            const balance = toCents(account.current_balance, null) ?? 0n

            return (
              <li key={account.id}>
                <article className="h-full rounded-xl border border-line bg-white p-4 sm:p-5">
                  <div className="flex items-start gap-3">
                    {((account.account_type === 'BANK' && account.bank_name) ||
                      (account.account_type === 'E_WALLET' && account.e_wallet_provider)) ? (
                      <FinancialProviderLogo
                        providerName={account.bank_name || account.e_wallet_provider}
                        providerType={account.account_type}
                        className="size-11 rounded-xl"
                      />
                    ) : (
                      <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand">
                        <Icon aria-hidden="true" size={21} strokeWidth={1.8} />
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <h2 className="truncate text-sm font-semibold text-ink">{account.name}</h2>
                      <p className="mt-1 text-xs text-muted">
                        {accountTypeLabel(account.account_type)}
                        {account.is_archived ? ' · Archived' : ''}
                      </p>
                      {account.bank_name && (
                        <p className="mt-1 truncate text-xs text-muted">{account.bank_name}</p>
                      )}
                      {account.e_wallet_provider && (
                        <p className="mt-1 truncate text-xs text-muted">
                          {account.e_wallet_provider}
                        </p>
                      )}
                    </div>
                    <p className="shrink-0 text-right text-xs font-semibold text-ink">
                      {account.currency}
                    </p>
                  </div>

                  <div className="mt-6">
                    <p className="text-xs font-medium text-muted">Current balance</p>
                    <p className="mt-1 text-2xl font-semibold tracking-tight text-ink">
                      {formatCents(balance)}
                    </p>
                  </div>
                  <p className="mt-1 text-xs text-muted">
                    Opening balance plus posted income, expenses, and transfers
                  </p>

                  <div className="mt-5 flex gap-2 border-t border-line pt-4">
                    <button
                      type="button"
                      onClick={() => openEditForm(account)}
                      className="inline-flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-line px-3 text-xs font-semibold text-muted hover:bg-canvas hover:text-ink"
                    >
                      <Pencil aria-hidden="true" size={14} />
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => setPendingArchiveAccount(account)}
                      disabled={Boolean(actionAccountId)}
                      className="inline-flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-line px-3 text-xs font-semibold text-muted hover:bg-canvas hover:text-ink disabled:opacity-50"
                    >
                      {account.is_archived ? (
                        <ArchiveRestore aria-hidden="true" size={14} />
                      ) : (
                        <Archive aria-hidden="true" size={14} />
                      )}
                      {actionAccountId === account.id
                        ? 'Saving…'
                        : account.is_archived
                          ? 'Restore'
                          : 'Archive'}
                    </button>
                  </div>
                </article>
              </li>
            )
          })}
        </ul>
      )}

      {editingAccount !== null && (
        <AccountForm
          account={editingAccount || null}
          busy={saving}
          error={formError}
          onCancel={() => {
            if (!saving) setEditingAccount(null)
          }}
          onSubmit={saveAccount}
        />
      )}
      {pendingArchiveAccount && (
        <ConfirmDialog
          title={pendingArchiveAccount.is_archived ? 'Restore this account?' : 'Archive this account?'}
          description={
            pendingArchiveAccount.is_archived
              ? `Restore “${pendingArchiveAccount.name}” to your active accounts?`
              : `Archive “${pendingArchiveAccount.name}”? Its history will be kept, and it cannot receive future transactions.`
          }
          confirmLabel={pendingArchiveAccount.is_archived ? 'Restore account' : 'Archive account'}
          destructive={!pendingArchiveAccount.is_archived}
          onCancel={() => setPendingArchiveAccount(null)}
          onConfirm={() => {
            const account = pendingArchiveAccount
            if (account) void toggleArchived(account)
          }}
        />
      )}
    </>
  )
}
