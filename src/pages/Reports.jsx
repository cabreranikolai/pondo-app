import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowDownToLine, ArrowUpFromLine, Scale, ChartNoAxesCombined, CircleAlert } from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import SummaryCard from '../components/dashboard/SummaryCard.jsx'
import EmptyState from '../components/ui/EmptyState.jsx'
import PageHeader from '../components/ui/PageHeader.jsx'
import { useAuth } from '../contexts/authContext.js'
import {
  categoryExpenses,
  currentMonthKey,
  fetchMonthlyReport,
  monthLabel,
  monthActivity,
  monthlyTrend,
  shiftMonth,
} from '../lib/financialReports.js'
import { formatCents, toCents } from '../lib/money.js'
import { formatCompactPHP, formatPHP } from '../lib/formatters.js'
import { supabase } from '../lib/supabase.js'

function reportError(error) {
  const details = `${error?.message || ''} ${error?.details || ''}`.toLowerCase()
  if (details.includes('get_financial_report')) {
    return 'Apply the Step 7 budgets and reports migration in Supabase before viewing reports.'
  }
  return 'Unable to load financial reports. Check your connection and try again.'
}

function ReportTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-line bg-white px-3 py-2.5 shadow-lg">
      <p className="mb-2 text-xs font-semibold text-ink">{label}</p>
      {payload.map((item) => (
        <p key={item.dataKey} className="text-xs leading-5 text-muted">
          {item.name}: <span className="font-semibold text-ink">{formatPHP(item.value)}</span>
        </p>
      ))}
    </div>
  )
}

export default function Reports() {
  const { user } = useAuth()
  const userId = user?.id
  const [month, setMonth] = useState(currentMonthKey)
  const [reportRows, setReportRows] = useState([])
  const [budgets, setBudgets] = useState([])
  const [loading, setLoading] = useState(true)
  const [pageError, setPageError] = useState('')

  const loadReport = useCallback(async () => {
    if (!userId) {
      setLoading(false)
      return
    }

    setLoading(true)
    const firstMonth = shiftMonth(month, -5)
    const reportPromise = fetchMonthlyReport(firstMonth, shiftMonth(month, 1))
      .then((data) => ({ data }))
      .catch((error) => ({ error }))
    const [reportResult, budgetResult] = await Promise.all([
      reportPromise,
      supabase
        .from('budgets')
        .select('id, category_id, amount_limit, month')
        .eq('user_id', userId)
        .eq('month', `${month}-01`),
    ])

    if ('error' in reportResult || budgetResult.error) {
      setReportRows([])
      setBudgets([])
      setPageError(reportError('error' in reportResult ? reportResult.error : budgetResult.error))
    } else {
      setReportRows(reportResult.data)
      setBudgets(budgetResult.data || [])
      setPageError('')
    }
    setLoading(false)
  }, [month, userId])

  useEffect(() => {
    const timer = window.setTimeout(() => loadReport(), 0)
    return () => window.clearTimeout(timer)
  }, [loadReport])

  const totals = useMemo(() => monthActivity(reportRows, month), [reportRows, month])
  const categoryData = useMemo(() => categoryExpenses(reportRows, month), [reportRows, month])
  const trendMonths = useMemo(
    () => Array.from({ length: 6 }, (_, index) => shiftMonth(month, index - 5)),
    [month],
  )
  const trend = useMemo(() => monthlyTrend(reportRows, trendMonths), [reportRows, trendMonths])
  const net = totals.income - totals.expenses
  const overallBudget = budgets.find((budget) => budget.category_id === null)
  const categoryBudgets = budgets.filter((budget) => budget.category_id !== null)
  const budgetTotals = overallBudget
    ? {
        limit: toCents(overallBudget.amount_limit, null) ?? 0n,
        spent: totals.expenses,
        label: 'Overall monthly budget',
      }
    : categoryBudgets.length
      ? {
          limit: categoryBudgets.reduce((sum, item) => sum + (toCents(item.amount_limit, null) ?? 0n), 0n),
          spent: categoryBudgets.reduce((sum, item) => {
            const category = categoryData.find((row) => row.id === item.category_id)
            return sum + (category?.spent || 0n)
          }, 0n),
          label: 'Combined category budgets',
        }
      : null
  const budgetPercent = budgetTotals?.limit
    ? Number((budgetTotals.spent * 10000n) / budgetTotals.limit) / 100
    : null
  const hasActivity = reportRows.length > 0

  return (
    <>
      <PageHeader
        eyebrow="Understand your money"
        title="Reports"
        action={
          <label className="flex items-center gap-2 text-sm font-medium text-muted">
            <span>Month</span>
            <input
              type="month"
              aria-label="Report month"
              value={month}
              onChange={(event) => event.target.value && setMonth(event.target.value)}
              className="min-h-10 rounded-lg border border-line bg-white px-2 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/15"
            />
          </label>
        }
      />

      {pageError && (
        <div className="mb-5 flex items-center justify-between gap-3 rounded-lg bg-danger-soft px-3 py-3 text-sm text-danger" role="alert">
          <span className="flex items-center gap-2"><CircleAlert aria-hidden="true" size={17} />{pageError}</span>
          <button type="button" onClick={loadReport} className="shrink-0 font-semibold underline">Retry</button>
        </div>
      )}

      <section aria-label={`Financial summary for ${monthLabel(month)}`} className="mb-6 grid grid-cols-2 gap-3 xl:grid-cols-4 lg:gap-4">
        <SummaryCard
          label="Income"
          amount={formatCents(totals.income)}
          icon={ArrowDownToLine}
          detail={monthLabel(month)}
          tone="positive"
        />
        <SummaryCard
          label="Expenses"
          amount={formatCents(totals.expenses)}
          icon={ArrowUpFromLine}
          detail={monthLabel(month)}
          tone="negative"
        />
        <SummaryCard
          label="Net cash flow"
          amount={formatCents(net)}
          icon={Scale}
          detail="Income minus expenses"
          tone={net >= 0n ? 'positive' : 'negative'}
        />
        <SummaryCard
          label="Budget utilization"
          amount={budgetTotals ? budgetTotals.limit > 0n ? `${Math.round(budgetPercent)}%` : '—' : '—'}
          icon={ChartNoAxesCombined}
          detail={
            budgetTotals
              ? `${formatCents(budgetTotals.spent)} of ${formatCents(budgetTotals.limit)} · ${budgetTotals.label}`
              : 'No budget set for this month'
          }
          tone={budgetPercent !== null && budgetPercent >= 100 ? 'negative' : 'default'}
        />
      </section>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(300px,1fr)]">
        <section aria-labelledby="report-trend-title" className="min-w-0 rounded-xl border border-line bg-white p-4 sm:p-6">
          <div className="mb-3 sm:mb-5">
            <h2 id="report-trend-title" className="text-base font-semibold text-ink">Income and expenses over time</h2>
            <p className="mt-1 text-xs text-muted">Six months ending {monthLabel(month)} · PHP</p>
          </div>
          {loading ? (
            <div className="grid h-[240px] place-items-center text-sm text-muted sm:h-[280px]" role="status">Loading report…</div>
          ) : !hasActivity ? (
            <EmptyState title="No activity in this period" description="Monthly totals will appear after you record income or expenses." />
          ) : (
            <div className="h-[240px] w-full sm:h-[280px]" role="img" aria-label="Bar chart showing monthly income and expenses">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trend} margin={{ top: 8, right: 4, left: -18, bottom: 0 }} barGap={4}>
                  <CartesianGrid vertical={false} stroke="#edf0ed" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: 'var(--pond-muted-gray)', fontSize: 11 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--pond-muted-gray)', fontSize: 10 }} tickFormatter={formatCompactPHP} width={58} />
                  <Tooltip content={<ReportTooltip />} cursor={{ fill: 'var(--pond-warm-ivory)' }} />
                  <Bar name="Income" dataKey="incomeCentavos" fill="var(--pond-forest-green)" radius={[4, 4, 0, 0]} maxBarSize={24} />
                  <Bar name="Expenses" dataKey="expensesCentavos" fill="var(--pond-expense-chart)" radius={[4, 4, 0, 0]} maxBarSize={24} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>

        <section aria-labelledby="report-categories-title" className="rounded-xl border border-line bg-white p-5 sm:p-6">
          <div className="mb-5">
            <h2 id="report-categories-title" className="text-base font-semibold text-ink">Spending by category</h2>
            <p className="mt-1 text-xs text-muted">{monthLabel(month)} · expenses only</p>
          </div>
          {loading ? (
            <div className="grid min-h-40 place-items-center text-sm text-muted" role="status">Loading categories…</div>
          ) : categoryData.length === 0 ? (
            <EmptyState title="No categorized expenses" description="Expense categories will appear here after you record spending." />
          ) : (
            <div className="space-y-4">
              <div className="h-[200px] w-full sm:h-[220px]" role="img" aria-label="Bar chart showing expenses by category">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryData.slice(0, 8).map((item) => ({ ...item, expenseCentavos: Number(item.spent) }))} layout="vertical" margin={{ top: 2, right: 10, left: 3, bottom: 2 }}>
                    <CartesianGrid horizontal={false} stroke="#edf0ed" />
                    <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: 'var(--pond-muted-gray)', fontSize: 10 }} tickFormatter={formatCompactPHP} />
                    <YAxis type="category" dataKey="name" width={92} axisLine={false} tickLine={false} tick={{ fill: 'var(--pond-muted-gray)', fontSize: 10 }} />
                    <Tooltip formatter={(value) => formatPHP(value)} cursor={{ fill: 'var(--pond-warm-ivory)' }} />
                    <Bar name="Expenses" dataKey="expenseCentavos" fill="var(--pond-expense-chart)" radius={[0, 4, 4, 0]} maxBarSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <ul className="divide-y divide-line">
                {categoryData.map((item) => (
                  <li key={item.id || item.name} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                    <span className="truncate font-medium text-ink">{item.name}</span>
                    <span className="shrink-0 tabular-nums text-muted">{formatCents(item.spent)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </div>
      {!loading && !pageError && !hasActivity && (
        <p className="mt-4 text-center text-xs text-muted">
          Transfers are excluded from income, expense, and cash-flow totals.
        </p>
      )}
    </>
  )
}
