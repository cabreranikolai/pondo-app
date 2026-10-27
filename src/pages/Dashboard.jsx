import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Scale,
  Wallet,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import BudgetOverview from '../components/dashboard/BudgetOverview.jsx'
import MonthlyOverviewChart from '../components/dashboard/MonthlyOverviewChart.jsx'
import SummaryCard from '../components/dashboard/SummaryCard.jsx'
import TransactionList from '../components/dashboard/TransactionList.jsx'
import EmptyState from '../components/ui/EmptyState.jsx'
import PageHeader from '../components/ui/PageHeader.jsx'
import { useAuth } from '../contexts/authContext.js'
import {
  activityTotals,
  categoryExpenses,
  currentMonthKey,
  fetchMonthlyReport,
  monthLabel,
  monthlyTrend,
  shiftMonth,
} from '../lib/financialReports.js'
import { formatCents, toCents } from '../lib/money.js'
import { supabase } from '../lib/supabase.js'

function dashboardError(error) {
  const detail = `${error?.message || ''} ${error?.details || ''}`.toLowerCase()
  if (detail.includes('get_financial_report') || detail.includes('account_balances')) {
    return 'Apply the Step 7 budgets and reports migration in Supabase to enable live dashboard summaries.'
  }
  return 'Unable to load your financial overview. Check your connection and try again.'
}

export default function Dashboard() {
  const { user } = useAuth()
  const userId = user?.id
  const [month, setMonth] = useState(currentMonthKey)
  const [loading, setLoading] = useState(true)
  const [pageError, setPageError] = useState('')
  const [reportRows, setReportRows] = useState([])
  const [accounts, setAccounts] = useState([])
  const [budgets, setBudgets] = useState([])
  const [recentTransactions, setRecentTransactions] = useState([])

  const loadDashboard = useCallback(async () => {
    if (!userId) {
      setLoading(false)
      return
    }

    setLoading(true)
    const firstTrendMonth = shiftMonth(month, -5)
    const reportPromise = fetchMonthlyReport(firstTrendMonth, shiftMonth(month, 1))
      .then((data) => ({ data }))
      .catch((error) => ({ error }))
    const [reportResult, accountResult, budgetResult, categoryResult, transactionResult] = await Promise.all([
      reportPromise,
      supabase
        .from('account_balances')
        .select('id, user_id, current_balance, currency, is_archived')
        .eq('user_id', userId)
        .eq('is_archived', false),
      supabase
        .from('budgets')
        .select('id, category_id, amount_limit, month')
        .eq('user_id', userId)
        .eq('month', `${month}-01`),
      supabase
        .from('categories')
        .select('id, name')
        .or(`user_id.is.null,user_id.eq.${userId}`)
        .eq('type', 'EXPENSE'),
      supabase
        .from('transaction_history')
        .select('transaction_id, type, amount, description, transaction_date, category_name, account_name, from_account_name, to_account_name')
        .eq('user_id', userId)
        .order('transaction_date', { ascending: false })
        .limit(5),
    ])

    const reportError = 'error' in reportResult ? reportResult.error : null
    const queryError =
      reportError || accountResult.error || budgetResult.error || categoryResult.error || transactionResult.error

    if (queryError) {
      setReportRows([])
      setAccounts([])
      setBudgets([])
      setRecentTransactions([])
      setPageError(dashboardError(queryError))
    } else {
      setReportRows(reportResult.data)
      setAccounts(accountResult.data || [])
      const categoryNames = new Map((categoryResult.data || []).map((category) => [category.id, category.name]))
      setBudgets(
        (budgetResult.data || []).map((budget) => ({
          ...budget,
          category_name: categoryNames.get(budget.category_id) || '',
        })),
      )
      setRecentTransactions(transactionResult.data || [])
      setPageError('')
    }
    setLoading(false)
  }, [month, userId])

  useEffect(() => {
    const timer = window.setTimeout(() => loadDashboard(), 0)
    return () => window.clearTimeout(timer)
  }, [loadDashboard])

  const totals = useMemo(() => activityTotals(reportRows.filter((row) => row.month === `${month}-01`)), [reportRows, month])
  const netCashFlow = totals.income - totals.expenses
  const trendMonths = useMemo(
    () => Array.from({ length: 6 }, (_, index) => shiftMonth(month, index - 5)),
    [month],
  )
  const trend = useMemo(() => monthlyTrend(reportRows, trendMonths), [reportRows, trendMonths])
  const spending = useMemo(() => categoryExpenses(reportRows, month), [reportRows, month])
  const totalBalance = useMemo(
    () => accounts.reduce((sum, account) => sum + (toCents(account.current_balance, null) ?? 0n), 0n),
    [accounts],
  )

  const overallBudget = budgets.find((budget) => budget.category_id === null)
  const categoryBudgets = budgets.filter((budget) => budget.category_id !== null)
  const categorySpendById = useMemo(
    () => new Map(spending.map((item) => [item.id || 'uncategorized', item.spent])),
    [spending],
  )
  const utilization = useMemo(() => {
    if (overallBudget) {
      return {
        spent: totals.expenses,
        limit: toCents(overallBudget.amount_limit, null) ?? 0n,
        label: 'Overall budget',
      }
    }
    if (categoryBudgets.length) {
      const limit = categoryBudgets.reduce(
        (sum, budget) => sum + (toCents(budget.amount_limit, null) ?? 0n),
        0n,
      )
      const spent = categoryBudgets.reduce(
        (sum, budget) => sum + (categorySpendById.get(budget.category_id) || 0n),
        0n,
      )
      return { spent, limit, label: 'Category budgets combined' }
    }
    return null
  }, [categoryBudgets, categorySpendById, overallBudget, totals.expenses])

  const budgetPercent = utilization?.limit
    ? Number((utilization.spent * 10000n) / utilization.limit) / 100
    : null
  const currentDate = new Date()
  const greeting =
    currentDate.getHours() < 12
      ? 'Good morning'
      : currentDate.getHours() < 18
        ? 'Good afternoon'
        : 'Good evening'

  const summaryCards = [
    {
      label: 'Total balance',
      amount: formatCents(totalBalance),
      icon: Wallet,
      detail: 'Across active accounts',
      tone: 'default',
    },
    {
      label: 'Monthly income',
      amount: formatCents(totals.income),
      icon: ArrowDownToLine,
      detail: monthLabel(month),
      tone: 'positive',
    },
    {
      label: 'Monthly expenses',
      amount: formatCents(totals.expenses),
      icon: ArrowUpFromLine,
      detail: monthLabel(month),
      tone: 'negative',
    },
    {
      label: 'Net cash flow',
      amount: formatCents(netCashFlow),
      icon: Scale,
      detail: 'Income minus expenses',
      tone: netCashFlow >= 0n ? 'positive' : 'negative',
    },
    {
      label: 'Budget utilization',
      amount: utilization
        ? utilization.limit > 0n
          ? `${Math.round(budgetPercent)}%`
          : '—'
        : '—',
      icon: Wallet,
      detail: utilization
        ? `${formatCents(utilization.spent)} of ${formatCents(utilization.limit)} · ${utilization.label}`
        : 'No budget set for this month',
      tone: budgetPercent !== null && budgetPercent >= 100 ? 'negative' : 'default',
    },
  ]

  return (
    <>
      <PageHeader
        eyebrow={new Intl.DateTimeFormat('en-PH', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        }).format(currentDate)}
        title={greeting}
        description="Here’s a clear look at your money this month."
        action={
          <label className="flex items-center gap-2 text-sm font-medium text-muted">
            <span>Period</span>
            <input
              type="month"
              aria-label="Dashboard report month"
              value={month}
              onChange={(event) => event.target.value && setMonth(event.target.value)}
              className="min-h-10 rounded-lg border border-line bg-white px-2 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/15"
            />
          </label>
        }
      />

      {pageError && (
        <div className="mb-5 flex items-center justify-between gap-3 rounded-lg bg-danger-soft px-3 py-3 text-sm text-danger" role="alert">
          <span>{pageError}</span>
          <button type="button" onClick={loadDashboard} className="shrink-0 font-semibold underline">Retry</button>
        </div>
      )}

      <section aria-label={`Financial summary for ${monthLabel(month)}`} className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-3 2xl:grid-cols-5 lg:gap-4">
        {summaryCards.map((card) => (
          <div key={card.label} className={loading ? 'animate-pulse opacity-60' : ''}>
            <SummaryCard {...card} />
          </div>
        ))}
      </section>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,1fr)]">
        <div className="space-y-5">
          <MonthlyOverviewChart data={trend} loading={loading} />
          <TransactionList transactions={recentTransactions} loading={loading} />
        </div>
        <div className="space-y-5">
          <BudgetOverview budgets={budgets} spending={spending} loading={loading} month={month} />
          <section aria-labelledby="dashboard-category-spending" className="rounded-xl border border-line bg-white p-5 sm:p-6">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 id="dashboard-category-spending" className="text-base font-semibold text-ink">Spending by category</h2>
                <p className="mt-1 text-xs text-muted">{monthLabel(month)}</p>
              </div>
              <Link to="/reports" className="text-xs font-semibold text-brand-dark hover:underline">View report</Link>
            </div>
            {loading ? (
              <div className="grid min-h-32 place-items-center text-sm text-muted" role="status">Loading spending…</div>
            ) : spending.length === 0 ? (
              <EmptyState title="No expenses yet" description="Expenses by category will appear here." />
            ) : (
              <ul className="space-y-3">
                {spending.slice(0, 6).map((item) => {
                  const percentage = totals.expenses > 0n
                    ? Number((item.spent * 10000n) / totals.expenses) / 100
                    : 0
                  return (
                    <li key={item.id || item.name}>
                      <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
                        <span className="truncate font-medium text-ink">{item.name}</span>
                        <span className="shrink-0 tabular-nums text-muted">{formatCents(item.spent)}</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-canvas">
                        <div className="h-full rounded-full bg-danger" style={{ width: `${Math.min(percentage, 100)}%` }} />
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
        </div>
      </div>
    </>
  )
}
