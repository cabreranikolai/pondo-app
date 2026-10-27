import { useCallback, useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, CircleAlert, Pencil, Plus, Tags, Trash2, X } from 'lucide-react'
import EmptyState from '../components/ui/EmptyState.jsx'
import PageHeader from '../components/ui/PageHeader.jsx'
import { useAuth } from '../contexts/authContext.js'
import {
  categoryExpenses,
  currentMonthKey,
  fetchMonthlyReport,
  monthLabel,
  shiftMonth,
} from '../lib/financialReports.js'
import { centsToDecimal, formatCents, toCents } from '../lib/money.js'
import { supabase } from '../lib/supabase.js'

function BudgetForm({ budget, categories, busy, error, monthKey, onCancel, onSubmit }) {
  const [categoryId, setCategoryId] = useState(budget?.category_id || '')
  const [amount, setAmount] = useState(String(budget?.amount_limit || ''))
  const [month, setMonth] = useState(budget?.month?.slice(0, 7) || monthKey)
  const [validationError, setValidationError] = useState('')

  function handleSubmit(event) {
    event.preventDefault()
    const amountCents = toCents(amount)
    if (amountCents === null || amountCents <= 0n) {
      setValidationError('Enter a budget limit greater than zero with up to 2 decimal places.')
      return
    }
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      setValidationError('Choose a valid budget month.')
      return
    }
    if (categoryId && !categories.some((category) => category.id === categoryId)) {
      setValidationError('Choose an available expense category.')
      return
    }

    onSubmit({
      category_id: categoryId || null,
      amount_limit: centsToDecimal(amountCents),
      month: `${month}-01`,
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-0 sm:items-center sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onCancel()
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="budget-form-title"
        className="w-full rounded-t-2xl bg-white p-5 shadow-xl sm:max-w-lg sm:rounded-2xl sm:p-7"
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand">Plan ahead</p>
            <h2 id="budget-form-title" className="mt-1 text-xl font-semibold text-ink">
              {budget ? 'Edit budget' : 'Create budget'}
            </h2>
            <p className="mt-1 text-sm leading-5 text-muted">
              Choose a category for a spending plan, or leave it as an overall monthly budget.
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            aria-label="Close budget form"
            className="grid size-9 shrink-0 place-items-center rounded-lg text-muted hover:bg-canvas disabled:opacity-50"
          >
            <X aria-hidden="true" size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="budget-category" className="mb-1.5 block text-sm font-medium text-ink">
              Budget type
            </label>
            <select
              id="budget-category"
              value={categoryId}
              onChange={(event) => {
                setCategoryId(event.target.value)
                setValidationError('')
              }}
              className="min-h-11 w-full rounded-lg border border-line bg-white px-3 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/15"
            >
              <option value="">Overall monthly budget</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="budget-amount" className="mb-1.5 block text-sm font-medium text-ink">
              Monthly limit
            </label>
            <div className="flex min-h-11 items-center rounded-lg border border-line bg-white focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/15">
              <span className="pl-3 text-sm text-muted">₱</span>
              <input
                id="budget-amount"
                inputMode="decimal"
                autoComplete="off"
                required
                value={amount}
                onChange={(event) => {
                  setAmount(event.target.value)
                  setValidationError('')
                }}
                aria-describedby="budget-amount-help"
                className="min-w-0 flex-1 bg-transparent px-2 text-sm text-ink outline-none"
              />
              <span className="pr-3 text-xs text-muted">PHP</span>
            </div>
            <p id="budget-amount-help" className="mt-1.5 text-xs text-muted">
              Use a positive amount with up to 2 decimal places.
            </p>
          </div>

          <div>
            <label htmlFor="budget-month" className="mb-1.5 block text-sm font-medium text-ink">
              Month
            </label>
            <input
              id="budget-month"
              type="month"
              required
              value={month}
              onChange={(event) => {
                setMonth(event.target.value)
                setValidationError('')
              }}
              className="min-h-11 w-full rounded-lg border border-line bg-white px-3 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/15"
            />
          </div>

          {(validationError || error) && (
            <p className="rounded-lg bg-danger-soft px-3 py-2.5 text-sm text-danger" role="alert">
              {validationError || error}
            </p>
          )}

          <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onCancel}
              disabled={busy}
              className="min-h-11 rounded-lg border border-line px-4 text-sm font-medium text-muted hover:bg-canvas disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="min-h-11 rounded-lg bg-brand px-4 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:cursor-wait disabled:opacity-60"
            >
              {busy ? 'Saving…' : budget ? 'Save changes' : 'Create budget'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}

function BudgetCard({ budget, spent, busy, onEdit, onDelete }) {
  const limit = toCents(budget.amount_limit) ?? 0n
  const remaining = limit - spent
  const percent = limit > 0n ? Number((spent * 10000n) / limit) / 100 : 0
  const isOver = spent > limit
  const isWarning = percent >= 80
  const color = isOver ? 'bg-danger' : isWarning ? 'bg-warning' : 'bg-brand'
  const statusColor = isOver ? 'text-danger' : isWarning ? 'text-warning' : 'text-muted'
  const title = budget.category_id ? budget.category_name || 'Category budget' : 'Overall budget'

  return (
    <article className="rounded-xl border border-line bg-white p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold text-ink">{title}</h2>
          <p className="mt-1 text-xs text-muted">
            {formatCents(spent)} spent <span aria-hidden="true">/</span> {formatCents(limit)}
          </p>
        </div>
        <div className="flex shrink-0 gap-1">
          <button
            type="button"
            onClick={() => onEdit(budget)}
            aria-label={`Edit ${title}`}
            className="grid size-9 place-items-center rounded-lg text-muted hover:bg-canvas hover:text-ink"
          >
            <Pencil aria-hidden="true" size={16} />
          </button>
          <button
            type="button"
            onClick={() => onDelete(budget)}
            disabled={busy}
            aria-label={`Delete ${title}`}
            className="grid size-9 place-items-center rounded-lg text-danger hover:bg-danger-soft disabled:opacity-50"
          >
            <Trash2 aria-hidden="true" size={16} />
          </button>
        </div>
      </div>

      <div className="mt-5 flex items-end justify-between gap-3">
        <p className={`text-xs font-medium ${statusColor}`}>
          {isOver ? 'Over budget' : 'Remaining'}
        </p>
        <p className={`text-right text-sm font-semibold tabular-nums ${statusColor}`}>
          {formatCents(remaining < 0n ? -remaining : remaining)}
          {isOver ? ' over' : ''}
        </p>
      </div>
      <div
        className="mt-2 h-2 overflow-hidden rounded-full bg-canvas"
        role="progressbar"
        aria-label={`${title} utilization`}
        aria-valuemin={0}
        aria-valuenow={Math.min(Math.round(percent), 100)}
        aria-valuemax={100}
        aria-valuetext={`${Math.round(percent)} percent used${isOver ? ', over budget' : ''}`}
      >
        <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(percent, 100)}%` }} />
      </div>
      <p className={`mt-2 text-xs ${statusColor}`}>
        {Math.round(percent)}% used
        {isOver ? ' · Spending has exceeded this limit.' : isWarning ? ' · You have used most of this limit.' : ''}
      </p>
    </article>
  )
}

export default function Budgets() {
  const { user } = useAuth()
  const userId = user?.id
  const [month, setMonth] = useState(currentMonthKey)
  const [budgets, setBudgets] = useState([])
  const [categories, setCategories] = useState([])
  const [spending, setSpending] = useState([])
  const [loading, setLoading] = useState(true)
  const [pageError, setPageError] = useState('')
  const [success, setSuccess] = useState('')
  const [dialogBudget, setDialogBudget] = useState(null)
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  const loadData = useCallback(async () => {
    if (!userId) {
      setBudgets([])
      setCategories([])
      setSpending([])
      setLoading(false)
      return
    }

    setLoading(true)
    const reportPromise = fetchMonthlyReport(month, shiftMonth(month, 1))
      .then((data) => ({ data }))
      .catch((error) => ({ error }))
    const [budgetResult, categoryResult, reportResult] = await Promise.all([
      supabase
        .from('budgets')
        .select('id, user_id, category_id, amount_limit, month, created_at')
        .eq('user_id', userId)
        .eq('month', `${month}-01`)
        .order('created_at'),
      supabase
        .from('categories')
        .select('id, user_id, name, type')
        .or(`user_id.is.null,user_id.eq.${userId}`)
        .eq('type', 'EXPENSE')
        .order('name'),
      reportPromise,
    ])

    if (budgetResult.error || categoryResult.error || 'error' in reportResult) {
      setBudgets([])
      setCategories([])
      setSpending([])
      setPageError(
        'error' in reportResult && String(reportResult.error?.message).includes('get_financial_report')
          ? 'Apply the Step 7 budgets and reports migration in Supabase before using budgets.'
          : 'Unable to load budgets and spending. Check your connection and try again.',
      )
    } else {
      const categoryNames = new Map((categoryResult.data || []).map((category) => [category.id, category.name]))
      setBudgets(
        (budgetResult.data || []).map((budget) => ({
          ...budget,
          category_name: categoryNames.get(budget.category_id) || '',
        })),
      )
      setCategories(categoryResult.data || [])
      setSpending(categoryExpenses(reportResult.data, month))
      setPageError('')
    }
    setLoading(false)
  }, [month, userId])

  useEffect(() => {
    const timer = window.setTimeout(() => loadData(), 0)
    return () => window.clearTimeout(timer)
  }, [loadData])

  const categorySpending = useMemo(
    () => new Map(spending.map((item) => [item.id || 'uncategorized', item.spent])),
    [spending],
  )
  const totalSpending = useMemo(
    () => spending.reduce((sum, item) => sum + item.spent, 0n),
    [spending],
  )
  const overallBudget = budgets.find((budget) => budget.category_id === null)
  const categoryBudgets = budgets.filter((budget) => budget.category_id !== null)

  async function saveBudget(payload) {
    if (!userId || saving) return
    setSaving(true)
    setFormError('')
    setPageError('')
    setSuccess('')
    try {
      if (dialogBudget) {
        const { data, error } = await supabase
          .from('budgets')
          .update({
            category_id: payload.category_id,
            amount_limit: payload.amount_limit,
            month: payload.month,
          })
          .eq('id', dialogBudget.id)
          .eq('user_id', userId)
          .select('id')
          .maybeSingle()
        if (error) throw error
        if (!data) throw new Error('No budget was updated.')
        setSuccess('Budget updated.')
      } else {
        const { error } = await supabase.from('budgets').insert({
          ...payload,
          user_id: userId,
        })
        if (error) throw error
        setSuccess('Budget created.')
      }
      setDialogBudget(null)
      await loadData()
    } catch (error) {
      setFormError(
        error?.code === '23505'
          ? 'A budget already exists for that category and month.'
          : 'Unable to save this budget. Check the details and try again.',
      )
    } finally {
      setSaving(false)
    }
  }

  async function deleteBudget(budget) {
    const title = budget.category_id ? budget.category_name || 'this category budget' : 'this overall budget'
    if (!window.confirm(`Delete ${title} for ${monthLabel(budget.month.slice(0, 7))}?`)) return

    setSaving(true)
    setPageError('')
    setSuccess('')
    try {
      const { error } = await supabase
        .from('budgets')
        .delete()
        .eq('id', budget.id)
        .eq('user_id', userId)
      if (error) throw error
      setSuccess('Budget deleted.')
      await loadData()
    } catch {
      setPageError('Unable to delete this budget. Check your connection and try again.')
    } finally {
      setSaving(false)
    }
  }

  const allBudgets = overallBudget ? [overallBudget, ...categoryBudgets] : categoryBudgets

  return (
    <>
      <PageHeader
        eyebrow="Plan ahead"
        title="Budgets"
        description="Set monthly spending limits and see how actual expenses compare."
        action={
          <button
            type="button"
            onClick={() => {
              setFormError('')
              setDialogBudget(false)
            }}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-brand px-4 text-sm font-semibold text-white transition hover:bg-brand-dark"
          >
            <Plus aria-hidden="true" size={17} />
            Add budget
          </button>
        }
      />

      {pageError && (
        <div className="mb-5 flex items-start gap-2 rounded-lg bg-danger-soft px-3 py-3 text-sm text-danger" role="alert">
          <CircleAlert aria-hidden="true" className="mt-0.5 shrink-0" size={17} />
          <span>{pageError}</span>
          <button
            type="button"
            onClick={loadData}
            className="ml-auto shrink-0 font-semibold underline"
          >
            Retry
          </button>
        </div>
      )}
      {success && !pageError && (
        <p className="mb-5 rounded-lg bg-brand-soft px-3 py-2.5 text-sm text-brand-dark" role="status">{success}</p>
      )}

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-white p-3 sm:p-4">
        <button
          type="button"
          onClick={() => setMonth((current) => shiftMonth(current, -1))}
          aria-label="Previous month"
          className="grid size-10 place-items-center rounded-lg border border-line text-muted hover:bg-canvas"
        >
          <ChevronLeft aria-hidden="true" size={18} />
        </button>
        <label className="flex items-center gap-3">
          <span className="text-sm font-semibold text-ink">{monthLabel(month)}</span>
          <input
            type="month"
            aria-label="Select budget month"
            value={month}
            onChange={(event) => event.target.value && setMonth(event.target.value)}
            className="min-h-10 rounded-lg border border-line bg-white px-2 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/15"
          />
        </label>
        <button
          type="button"
          onClick={() => setMonth((current) => shiftMonth(current, 1))}
          aria-label="Next month"
          className="grid size-10 place-items-center rounded-lg border border-line text-muted hover:bg-canvas"
        >
          <ChevronRight aria-hidden="true" size={18} />
        </button>
      </div>

      {loading ? (
        <div className="grid min-h-48 place-items-center rounded-xl border border-line bg-white text-sm text-muted" role="status" aria-live="polite">
          Loading budgets…
        </div>
      ) : allBudgets.length === 0 ? (
        <EmptyState
          icon={Tags}
          title="No budgets for this month"
          description="Create an overall monthly limit or a category budget to start tracking your spending."
        />
      ) : (
        <div className="space-y-6">
          {overallBudget && (
            <section aria-labelledby="overall-budget-heading">
              <div className="mb-3">
                <h2 id="overall-budget-heading" className="text-base font-semibold text-ink">Overall spending plan</h2>
                <p className="mt-1 text-xs text-muted">All expenses counted once against your monthly total.</p>
              </div>
              <BudgetCard
                budget={{ ...overallBudget, category_name: 'Overall budget' }}
                spent={totalSpending}
                busy={saving}
                onEdit={(budget) => {
                  setFormError('')
                  setDialogBudget(budget)
                }}
                onDelete={deleteBudget}
              />
            </section>
          )}
          {categoryBudgets.length > 0 && (
            <section aria-labelledby="category-budgets-heading">
              <div className="mb-3">
                <h2 id="category-budgets-heading" className="text-base font-semibold text-ink">Category budgets</h2>
                <p className="mt-1 text-xs text-muted">Each category is measured against its own expense transactions.</p>
              </div>
              <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {categoryBudgets.map((budget) => (
                  <li key={budget.id}>
                    <BudgetCard
                      budget={budget}
                      spent={categorySpending.get(budget.category_id) || 0n}
                      busy={saving}
                      onEdit={(item) => {
                        setFormError('')
                        setDialogBudget(item)
                      }}
                      onDelete={deleteBudget}
                    />
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}

      {dialogBudget !== null && (
        <BudgetForm
          budget={dialogBudget || null}
          categories={categories}
          busy={saving}
          error={formError}
          monthKey={month}
          onCancel={() => setDialogBudget(null)}
          onSubmit={saveBudget}
        />
      )}
    </>
  )
}
