import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  CircleAlert,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react'
import EmptyState from '../components/ui/EmptyState.jsx'
import PageHeader from '../components/ui/PageHeader.jsx'
import { useAuth } from '../contexts/authContext.js'
import { centsToDecimal, formatCents, toCents } from '../lib/money.js'
import { supabase } from '../lib/supabase.js'

const PAGE_SIZE = 20
const TYPE_OPTIONS = [
  { value: 'INCOME', label: 'Income' },
  { value: 'EXPENSE', label: 'Expense' },
  { value: 'TRANSFER', label: 'Transfer' },
]

const EMPTY_FILTERS = {
  type: 'ALL',
  accountId: 'ALL',
  categoryId: 'ALL',
  fromDate: '',
  toDate: '',
  search: '',
}

function localDateValue(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function localDateTime(value, nextDay = false) {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day + (nextDay ? 1 : 0)).toISOString()
}

function dateForInput(value) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '' : localDateValue(date)
}

function displayDate(value) {
  return new Intl.DateTimeFormat('en-PH', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function transactionError(error) {
  const details = [
    error?.code,
    error?.message,
    error?.details,
    error?.hint,
  ].join(' ').toLowerCase()

  if (details.includes('account_balances') || details.includes('transaction_history')) {
    return 'The transaction database migration is not applied yet. Apply 20261026110000_accounts_archive_and_other_type.sql, then 20261026130000_transaction_history_and_atomic_writes.sql in Supabase, then retry.'
  }
  if (details.includes('is_archived')) {
    return 'The account archive migration is not applied yet. Apply 20261026110000_accounts_archive_and_other_type.sql before the transaction migration.'
  }
  if (details.includes('same currency')) {
    return 'Transfers are available only between accounts using the same currency.'
  }
  if (details.includes('archived account') || details.includes('active accounts')) {
    return 'Choose active accounts. Restore an archived account before using it for new activity.'
  }
  if (details.includes('category matching') || details.includes('category type')) {
    return 'Choose a category that matches the transaction type.'
  }
  if (details.includes('request was already used')) {
    return 'The retry details changed. Review the transaction and submit it again.'
  }
  if (details.includes('does not exist or is incomplete')) {
    return 'That transaction has changed or is no longer available. Refresh the history and try again.'
  }
  return 'Unable to complete that request. Check your connection and try again.'
}

function TransactionForm({ transaction, accounts, categories, busy, error, onCancel, onSubmit }) {
  const [form, setForm] = useState(() => ({
    type: transaction?.type || 'EXPENSE',
    accountId: transaction?.type === 'TRANSFER'
      ? transaction.from_account_id
      : transaction?.account_id || '',
    destinationAccountId: transaction?.to_account_id || '',
    categoryId: transaction?.category_id || '',
    amount: String(transaction?.amount ?? ''),
    date: transaction ? dateForInput(transaction.transaction_date) : localDateValue(new Date()),
    description: transaction?.description || '',
  }))
  const [validationError, setValidationError] = useState('')
  const [requestId, setRequestId] = useState('')
  const isTransfer = form.type === 'TRANSFER'
  const availableAccounts = useMemo(() => {
    const selectedIds = new Set(
      [transaction?.account_id, transaction?.from_account_id, transaction?.to_account_id]
        .filter(Boolean),
    )
    return accounts.filter(
      (account) => !account.is_archived || selectedIds.has(account.id),
    )
  }, [accounts, transaction])
  const availableCategories = categories.filter(
    (category) => category.type === form.type,
  )

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
    setValidationError('')
    setRequestId('')
  }

  function handleSubmit(event) {
    event.preventDefault()
    const amountCents = toCents(form.amount)
    if (amountCents === null || amountCents <= 0n) {
      setValidationError('Enter an amount greater than zero with up to 2 decimal places.')
      return
    }
    if (!form.date) {
      setValidationError('Choose a transaction date.')
      return
    }
    if (!form.accountId) {
      setValidationError(isTransfer ? 'Choose a source account.' : 'Choose an account.')
      return
    }
    if (isTransfer && !form.destinationAccountId) {
      setValidationError('Choose a destination account.')
      return
    }
    if (isTransfer && form.accountId === form.destinationAccountId) {
      setValidationError('Choose two different accounts for a transfer.')
      return
    }
    if (!isTransfer && !form.categoryId) {
      setValidationError('Choose a category.')
      return
    }

    let operationRequestId = requestId
    if (!transaction && !operationRequestId) {
      if (!globalThis.crypto?.randomUUID) {
        setValidationError('This browser cannot securely submit a transaction. Update the browser and try again.')
        return
      }
      operationRequestId = globalThis.crypto.randomUUID()
      setRequestId(operationRequestId)
    }

    onSubmit({
      ...form,
      requestId: operationRequestId,
      amount: centsToDecimal(amountCents),
      description: form.description.trim() || null,
      transactionDate: localDateTime(form.date),
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
        aria-labelledby="transaction-form-title"
        className="flex max-h-[88dvh] w-full flex-col overflow-hidden rounded-2xl bg-white p-4 shadow-xl sm:max-h-[92vh] sm:max-w-xl sm:p-7"
      >
        <div className="mb-3 flex shrink-0 items-start justify-between gap-3 sm:mb-5 sm:gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand">
              Your activity
            </p>
            <h2 id="transaction-form-title" className="mt-1 text-xl font-semibold text-ink">
              {transaction ? 'Edit transaction' : 'New transaction'}
            </h2>
            <p className="mt-1 text-sm leading-5 text-muted">
              Amounts are stored as exact decimals. Transfers move money between accounts without counting as income or expense.
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            aria-label="Close transaction form"
            className="grid size-9 shrink-0 place-items-center rounded-lg text-muted hover:bg-canvas disabled:opacity-50"
          >
            <X aria-hidden="true" size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain pr-1 sm:space-y-4">
          <div>
            <label htmlFor="transaction-type" className="mb-1.5 block text-sm font-medium text-ink">
              Type
            </label>
            <select
              id="transaction-type"
              value={form.type}
              disabled={Boolean(transaction)}
              onChange={(event) => {
                setForm((current) => ({
                  ...current,
                  type: event.target.value,
                  categoryId: '',
                }))
                setValidationError('')
                setRequestId('')
              }}
              className="min-h-11 w-full rounded-lg border border-line bg-white px-3 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/15 disabled:bg-canvas"
            >
              {TYPE_OPTIONS.map((type) => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="transaction-amount" className="mb-1.5 block text-sm font-medium text-ink">
              Amount
            </label>
            <div className="flex min-h-11 items-center rounded-lg border border-line bg-white focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/15">
              <span className="pl-3 text-sm text-muted">₱</span>
              <input
                id="transaction-amount"
                inputMode="decimal"
                autoComplete="off"
                required
                value={form.amount}
                onChange={(event) => updateField('amount', event.target.value)}
                aria-describedby="transaction-amount-help"
                className="min-w-0 flex-1 bg-transparent px-2 text-sm text-ink outline-none"
              />
              <span className="pr-3 text-xs text-muted">PHP</span>
            </div>
            <p id="transaction-amount-help" className="mt-1.5 text-xs text-muted">
              Use a positive amount with up to 2 decimal places.
            </p>
          </div>

          <div className={isTransfer ? 'grid gap-4 sm:grid-cols-2' : ''}>
            <div>
              <label htmlFor="transaction-account" className="mb-1.5 block text-sm font-medium text-ink">
                {isTransfer ? 'From account' : 'Account'}
              </label>
              <select
                id="transaction-account"
                required
                value={form.accountId}
                onChange={(event) => updateField('accountId', event.target.value)}
                className="min-h-11 w-full rounded-lg border border-line bg-white px-3 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/15"
              >
                <option value="">Choose an account</option>
                {availableAccounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}{account.is_archived ? ' (archived)' : ''}
                  </option>
                ))}
              </select>
            </div>
            {isTransfer && (
              <div>
                <label htmlFor="transaction-destination" className="mb-1.5 block text-sm font-medium text-ink">
                  To account
                </label>
                <select
                  id="transaction-destination"
                  required
                  value={form.destinationAccountId}
                  onChange={(event) => updateField('destinationAccountId', event.target.value)}
                  className="min-h-11 w-full rounded-lg border border-line bg-white px-3 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/15"
                >
                  <option value="">Choose an account</option>
                  {availableAccounts.map((account) => (
                    <option
                      key={account.id}
                      value={account.id}
                      disabled={account.id === form.accountId || (account.is_archived && account.id !== transaction?.to_account_id)}
                    >
                      {account.name}{account.is_archived ? ' (archived)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {!isTransfer && (
            <div>
              <label htmlFor="transaction-category" className="mb-1.5 block text-sm font-medium text-ink">
                Category
              </label>
              <select
                id="transaction-category"
                required
                value={form.categoryId}
                onChange={(event) => updateField('categoryId', event.target.value)}
                className="min-h-11 w-full rounded-lg border border-line bg-white px-3 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/15"
              >
                <option value="">Choose a category</option>
                {availableCategories.map((category) => (
                  <option key={category.id} value={category.id}>{category.name}</option>
                ))}
              </select>
              {availableCategories.length === 0 && (
                <p className="mt-1.5 text-xs text-muted">
                  No {form.type.toLowerCase()} categories are available yet.
                </p>
              )}
            </div>
          )}

          <div>
            <label htmlFor="transaction-date" className="mb-1.5 block text-sm font-medium text-ink">
              Date
            </label>
            <input
              id="transaction-date"
              type="date"
              required
              value={form.date}
              onChange={(event) => updateField('date', event.target.value)}
              className="min-h-11 w-full rounded-lg border border-line bg-white px-3 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/15"
            />
            <p className="mt-1.5 text-xs text-muted">Dates use your device's local timezone.</p>
          </div>

          <div>
            <label htmlFor="transaction-description" className="mb-1.5 block text-sm font-medium text-ink">
              Note <span className="font-normal text-muted">(optional)</span>
            </label>
            <textarea
              id="transaction-description"
              rows={2}
              maxLength={500}
              value={form.description}
              onChange={(event) => updateField('description', event.target.value)}
              placeholder="Add a note"
              className="w-full resize-y rounded-lg border border-line bg-white px-3 py-2.5 text-sm text-ink outline-none placeholder:text-muted focus:border-brand focus:ring-2 focus:ring-brand/15"
            />
          </div>

          {(validationError || error) && (
            <p className="rounded-lg bg-danger-soft px-3 py-2.5 text-sm text-danger" role="alert">
              {validationError || error}
            </p>
          )}

          </div>
          <div className="flex shrink-0 gap-2 border-t border-line bg-white pt-3 sm:justify-end">
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
              disabled={busy || accounts.filter((account) => !account.is_archived).length === 0}
              className="min-h-11 flex-1 rounded-lg bg-brand px-3 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:cursor-wait disabled:opacity-60 sm:flex-none sm:px-4"
            >
              {busy ? 'Saving…' : transaction ? 'Save changes' : 'Add transaction'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}

function TransactionItem({ transaction, busy, onEdit, onDelete }) {
  const isIncome = transaction.type === 'INCOME'
  const isExpense = transaction.type === 'EXPENSE'
  const Icon = isIncome ? ArrowDownLeft : isExpense ? ArrowUpRight : ArrowLeftRight
  const tone = isIncome
    ? 'bg-brand-soft text-brand-dark'
    : isExpense
      ? 'bg-danger-soft text-danger'
      : 'bg-canvas text-muted'
  const amount = toCents(transaction.amount) ?? 0n
  const amountLabel = `${isIncome ? '+' : isExpense ? '−' : ''}${formatCents(amount)}`

  return (
    <li className="rounded-xl border border-line bg-white p-4 sm:px-5">
      <div className="flex items-start gap-3">
        <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${tone}`}>
          <Icon aria-hidden="true" size={19} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
            <div className="min-w-0">
              <h2 className="truncate text-sm font-semibold text-ink">
                {transaction.description || (isIncome ? 'Income' : isExpense ? 'Expense' : 'Transfer')}
              </h2>
              <p className="mt-1 text-xs leading-5 text-muted">
                {isIncome || isExpense
                  ? `${transaction.category_name || 'Uncategorized'} · ${transaction.account_name || 'Account'}`
                  : `${transaction.from_account_name || 'Account'} → ${transaction.to_account_name || 'Account'}`}
              </p>
              <p className="mt-1 text-xs text-muted">{displayDate(transaction.transaction_date)}</p>
            </div>
            <p className={`shrink-0 text-base font-semibold tabular-nums ${isIncome ? 'text-brand-dark' : isExpense ? 'text-danger' : 'text-ink'}`}>
              {amountLabel}
            </p>
          </div>
          <div className="mt-3 flex justify-end gap-2 border-t border-line pt-3">
            <button
              type="button"
              onClick={() => onEdit(transaction)}
              disabled={busy}
              aria-label={`Edit ${transaction.type.toLowerCase()} transaction`}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-line px-3 text-xs font-semibold text-muted hover:bg-canvas hover:text-ink disabled:opacity-50"
            >
              <Pencil aria-hidden="true" size={14} />
              Edit
            </button>
            <button
              type="button"
              onClick={() => onDelete(transaction)}
              disabled={busy}
              aria-label={`Delete ${transaction.type.toLowerCase()} transaction`}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-line px-3 text-xs font-semibold text-danger hover:bg-danger-soft disabled:opacity-50"
            >
              <Trash2 aria-hidden="true" size={14} />
              Delete
            </button>
          </div>
        </div>
      </div>
    </li>
  )
}

export default function Transactions() {
  const { user } = useAuth()
  const userId = user?.id
  const [accounts, setAccounts] = useState([])
  const [categories, setCategories] = useState([])
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [transactions, setTransactions] = useState([])
  const [totalCount, setTotalCount] = useState(0)
  const [page, setPage] = useState(0)
  const [loadingOptions, setLoadingOptions] = useState(true)
  const [loadingTransactions, setLoadingTransactions] = useState(true)
  const [optionsError, setOptionsError] = useState('')
  const [transactionsError, setTransactionsError] = useState('')
  const [success, setSuccess] = useState('')
  const [editingTransaction, setEditingTransaction] = useState(null)
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)
  const requestSequence = useRef(0)

  const loadOptions = useCallback(async () => {
    if (!userId) {
      setAccounts([])
      setCategories([])
      setLoadingOptions(false)
      setOptionsError('')
      return
    }

    setLoadingOptions(true)
    const [accountResult, categoryResult] = await Promise.all([
      supabase
        .from('account_balances')
        .select('id, user_id, name, currency, is_archived')
        .eq('user_id', userId)
        .order('name'),
      supabase
        .from('categories')
        .select('id, user_id, name, type')
        .or(`user_id.is.null,user_id.eq.${userId}`)
        .order('name'),
    ])

    if (accountResult.error || categoryResult.error) {
      setAccounts([])
      setCategories([])
      setOptionsError(transactionError(accountResult.error || categoryResult.error))
    } else {
      setAccounts(accountResult.data || [])
      setCategories(categoryResult.data || [])
      setOptionsError('')
    }
    setLoadingOptions(false)
  }, [userId])

  const loadTransactions = useCallback(async () => {
    if (!userId) {
      setTransactions([])
      setTotalCount(0)
      setLoadingTransactions(false)
      setTransactionsError('')
      return
    }

    const requestNumber = ++requestSequence.current
    setLoadingTransactions(true)
    let query = supabase
      .from('transaction_history')
      .select(
        'transaction_id, user_id, type, amount, description, transaction_date, category_id, category_name, account_id, account_name, transfer_group_id, from_account_id, from_account_name, to_account_id, to_account_name',
        { count: 'exact' },
      )
      .eq('user_id', userId)
      .order('transaction_date', { ascending: false })
      .order('transaction_id', { ascending: false })

    if (filters.type !== 'ALL') query = query.eq('type', filters.type)
    if (filters.categoryId !== 'ALL') query = query.eq('category_id', filters.categoryId)
    if (filters.accountId !== 'ALL') {
      query = query.or(
        `account_id.eq.${filters.accountId},from_account_id.eq.${filters.accountId},to_account_id.eq.${filters.accountId}`,
      )
    }
    if (filters.fromDate) query = query.gte('transaction_date', localDateTime(filters.fromDate))
    if (filters.toDate) query = query.lt('transaction_date', localDateTime(filters.toDate, true))
    if (filters.search.trim()) {
      query = query.ilike('description', `%${filters.search.trim()}%`)
    }

    const { data, error, count } = await query.range(
      page * PAGE_SIZE,
      page * PAGE_SIZE + PAGE_SIZE - 1,
    )

    if (requestNumber !== requestSequence.current) return
    if (error) {
      setTransactions([])
      setTotalCount(0)
      setTransactionsError(transactionError(error))
    } else {
      const resultCount = count || 0
      const lastPage = Math.max(0, Math.ceil(resultCount / PAGE_SIZE) - 1)
      if (page > lastPage) {
        setTotalCount(resultCount)
        setPage(lastPage)
        return
      }
      setTransactions(data || [])
      setTotalCount(resultCount)
      setTransactionsError('')
    }
    setLoadingTransactions(false)
  }, [filters, page, userId])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadOptions()
    }, 0)
    return () => window.clearTimeout(timer)
  }, [loadOptions])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadTransactions()
    }, filters.search ? 250 : 0)
    return () => window.clearTimeout(timer)
  }, [loadTransactions, filters.search])

  const filteredCategories = useMemo(
    () => categories.filter((category) => filters.type === 'ALL' || category.type === filters.type),
    [categories, filters.type],
  )

  function updateFilter(field, value) {
    setFilters((current) => ({
      ...current,
      [field]: value,
      ...(field === 'type' ? { categoryId: 'ALL' } : {}),
    }))
    setPage(0)
    setSuccess('')
  }

  function resetFilters() {
    setFilters(EMPTY_FILTERS)
    setPage(0)
  }

  async function saveTransaction(payload) {
    if (!userId || saving) return
    setSaving(true)
    setFormError('')
    setOptionsError('')
    setTransactionsError('')
    setSuccess('')

    try {
      if (editingTransaction) {
        if (editingTransaction.type === 'TRANSFER') {
          const { error } = await supabase.rpc('update_transfer', {
            p_transfer_group_id: editingTransaction.transfer_group_id,
            p_from_account_id: payload.accountId,
            p_to_account_id: payload.destinationAccountId,
            p_amount: payload.amount,
            p_transaction_date: payload.transactionDate,
            p_description: payload.description,
          })
          if (error) throw error
        } else {
          const updates = {
            category_id: payload.categoryId,
            amount: payload.amount,
            description: payload.description,
            transaction_date: payload.transactionDate,
          }
          if (payload.accountId !== editingTransaction.account_id) {
            updates.account_id = payload.accountId
          }
          const { data, error } = await supabase
            .from('transactions')
            .update(updates)
            .eq('id', editingTransaction.transaction_id)
            .eq('user_id', userId)
            .select('id')
            .maybeSingle()
          if (error) throw error
          if (!data) throw new Error('No transaction was updated.')
        }
        setSuccess('Transaction updated.')
      } else {
        const { error } = await supabase.rpc('create_transaction', {
          p_request_id: payload.requestId,
          p_type: payload.type,
          p_account_id: payload.accountId,
          p_destination_account_id: payload.type === 'TRANSFER' ? payload.destinationAccountId : null,
          p_category_id: payload.type === 'TRANSFER' ? null : payload.categoryId,
          p_amount: payload.amount,
          p_transaction_date: payload.transactionDate,
          p_description: payload.description,
        })
        if (error) throw error
        setSuccess('Transaction added.')
      }

      setEditingTransaction(null)
      await Promise.all([loadTransactions(), loadOptions()])
    } catch (error) {
      setFormError(transactionError(error))
    } finally {
      setSaving(false)
    }
  }

  async function deleteTransaction(transaction) {
    const label = transaction.type === 'TRANSFER' ? 'transfer' : 'transaction'
    if (!window.confirm(`Delete this ${label}? This will update the affected account balance${transaction.type === 'TRANSFER' ? 's together' : ''}.`)) {
      return
    }

    setSaving(true)
    setTransactionsError('')
    setSuccess('')
    try {
      if (transaction.type === 'TRANSFER') {
        const { error } = await supabase.rpc('delete_transfer', {
          p_transfer_group_id: transaction.transfer_group_id,
        })
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('transactions')
          .delete()
          .eq('id', transaction.transaction_id)
          .eq('user_id', userId)
        if (error) throw error
      }
      setSuccess(`${label[0].toUpperCase()}${label.slice(1)} deleted.`)
      await Promise.all([loadTransactions(), loadOptions()])
    } catch (error) {
      setTransactionsError(transactionError(error))
    } finally {
      setSaving(false)
    }
  }

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))
  const hasActiveAccounts = accounts.some((account) => !account.is_archived)
  const pageError = optionsError || transactionsError

  return (
    <>
      <PageHeader
        eyebrow="Your activity"
        title="Transactions"
        action={
          <button
            type="button"
            data-tour="transaction-create"
            onClick={() => {
              setFormError('')
              setEditingTransaction(false)
            }}
            disabled={loadingOptions || !hasActiveAccounts}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-brand px-4 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus aria-hidden="true" size={17} />
            New transaction
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
              loadOptions()
              loadTransactions()
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

      {!loadingOptions && !pageError && !hasActiveAccounts && (
        <div className="mb-5 rounded-xl border border-line bg-white px-4 py-3 text-sm text-muted">
          Add or restore an active account before recording a transaction.
        </div>
      )}

      <section data-tour="transaction-history" aria-label="Transaction history filters" className="mb-5 rounded-xl border border-line bg-white p-4 sm:p-5">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink">
          <Search aria-hidden="true" size={16} className="text-brand" />
          Find a transaction
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <div>
            <label htmlFor="filter-search" className="mb-1 block text-xs font-medium text-muted">Description</label>
            <input
              id="filter-search"
              type="search"
              value={filters.search}
              onChange={(event) => updateFilter('search', event.target.value)}
              placeholder="Search notes"
              className="min-h-10 w-full rounded-lg border border-line px-3 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/15"
            />
          </div>
          <div>
            <label htmlFor="filter-type" className="mb-1 block text-xs font-medium text-muted">Type</label>
            <select
              id="filter-type"
              value={filters.type}
              onChange={(event) => updateFilter('type', event.target.value)}
              className="min-h-10 w-full rounded-lg border border-line bg-white px-3 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/15"
            >
              <option value="ALL">All types</option>
              {TYPE_OPTIONS.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="filter-account" className="mb-1 block text-xs font-medium text-muted">Account</label>
            <select
              id="filter-account"
              value={filters.accountId}
              onChange={(event) => updateFilter('accountId', event.target.value)}
              className="min-h-10 w-full rounded-lg border border-line bg-white px-3 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/15"
            >
              <option value="ALL">All accounts</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}{account.is_archived ? ' (archived)' : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="filter-category" className="mb-1 block text-xs font-medium text-muted">Category</label>
            <select
              id="filter-category"
              value={filters.categoryId}
              onChange={(event) => updateFilter('categoryId', event.target.value)}
              className="min-h-10 w-full rounded-lg border border-line bg-white px-3 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/15"
            >
              <option value="ALL">All categories</option>
              {filteredCategories.map((category) => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="filter-from-date" className="mb-1 block text-xs font-medium text-muted">From date</label>
            <input
              id="filter-from-date"
              type="date"
              value={filters.fromDate}
              max={filters.toDate || undefined}
              onChange={(event) => updateFilter('fromDate', event.target.value)}
              className="min-h-10 w-full rounded-lg border border-line px-3 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/15"
            />
          </div>
          <div className="flex items-end gap-2">
            <div className="min-w-0 flex-1">
              <label htmlFor="filter-to-date" className="mb-1 block text-xs font-medium text-muted">To date</label>
              <input
                id="filter-to-date"
                type="date"
                value={filters.toDate}
                min={filters.fromDate || undefined}
                onChange={(event) => updateFilter('toDate', event.target.value)}
                className="min-h-10 w-full rounded-lg border border-line px-3 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/15"
              />
            </div>
            <button
              type="button"
              onClick={resetFilters}
              className="min-h-10 shrink-0 rounded-lg border border-line px-3 text-xs font-semibold text-muted hover:bg-canvas"
            >
              Clear
            </button>
          </div>
        </div>
      </section>

      {loadingTransactions ? (
        <div className="grid min-h-48 place-items-center rounded-xl border border-line bg-white text-sm text-muted" role="status" aria-live="polite">
          Loading your transactions…
        </div>
      ) : transactions.length === 0 ? (
        <EmptyState
          icon={ArrowLeftRight}
          title={totalCount === 0 ? 'No transactions yet' : 'No transactions match'}
          description={
            totalCount === 0
              ? 'Add income, an expense, or a transfer to start building your history.'
              : 'Try changing your filters or search terms.'
          }
        />
      ) : (
        <>
          <ul className="space-y-3">
            {transactions.map((transaction) => (
              <TransactionItem
                key={transaction.transaction_id}
                transaction={transaction}
                busy={saving}
                onEdit={(item) => {
                  setFormError('')
                  setEditingTransaction(item)
                }}
                onDelete={deleteTransaction}
              />
            ))}
          </ul>
          <div className="mt-5 flex flex-col gap-3 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
            <p>
              {totalCount} {totalCount === 1 ? 'transaction' : 'transactions'} · Page {page + 1} of {totalPages}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPage((current) => Math.max(0, current - 1))}
                disabled={page === 0 || loadingTransactions}
                className="min-h-10 rounded-lg border border-line bg-white px-4 text-sm font-medium hover:bg-canvas disabled:cursor-not-allowed disabled:opacity-50"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() => setPage((current) => Math.min(totalPages - 1, current + 1))}
                disabled={page >= totalPages - 1 || loadingTransactions}
                className="min-h-10 rounded-lg border border-line bg-white px-4 text-sm font-medium hover:bg-canvas disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}

      {editingTransaction !== null && (
        <TransactionForm
          transaction={editingTransaction || null}
          accounts={accounts}
          categories={categories}
          busy={saving}
          error={formError}
          onCancel={() => setEditingTransaction(null)}
          onSubmit={saveTransaction}
        />
      )}
    </>
  )
}
