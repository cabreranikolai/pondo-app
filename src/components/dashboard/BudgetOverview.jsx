import { Tags } from 'lucide-react'
import { Link } from 'react-router-dom'
import EmptyState from '../ui/EmptyState.jsx'
import { monthLabel } from '../../lib/financialReports.js'
import { formatCents, toCents } from '../../lib/money.js'

function BudgetLine({ name, limit, spent }) {
  const percentage = limit > 0n ? Number((spent * 10000n) / limit) / 100 : 0
  const over = spent > limit
  return (
    <li className="py-3 first:pt-0 last:pb-0">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-ink">{name}</p>
          <p className="mt-1 text-xs text-muted">
            {formatCents(spent)} <span aria-hidden="true">/</span> {formatCents(limit)}
          </p>
        </div>
        <p className={`shrink-0 text-right text-xs font-medium ${over ? 'text-danger' : 'text-muted'}`}>
          {over ? 'Over by' : 'Left'}
          <span className="mt-1 block font-semibold">
            {formatCents(over ? spent - limit : limit - spent)}
          </span>
        </p>
      </div>
      <div
        className="mt-2 h-2 overflow-hidden rounded-full bg-canvas"
        role="progressbar"
        aria-label={`${name} budget utilization`}
        aria-valuemin={0}
        aria-valuenow={Math.min(Math.round(percentage), 100)}
        aria-valuemax={100}
        aria-valuetext={`${Math.round(percentage)} percent used${over ? ', over budget' : ''}`}
      >
        <div
          className={`h-full rounded-full ${over ? 'bg-danger' : 'bg-brand'}`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
    </li>
  )
}

export default function BudgetOverview({ budgets = [], spending = [], loading = false, month }) {
  const spendingByCategory = new Map(spending.map((item) => [item.id, item.spent]))
  const overview = budgets.map((budget) => ({
    id: budget.id,
    name: budget.category_id
      ? budget.category_name || spending.find((item) => item.id === budget.category_id)?.name || 'Category budget'
      : 'Overall budget',
    limit: toCents(budget.amount_limit, null) ?? 0n,
    spent: budget.category_id
      ? spendingByCategory.get(budget.category_id) || 0n
      : spending.reduce((sum, item) => sum + item.spent, 0n),
    categoryId: budget.category_id,
  }))

  return (
    <section aria-labelledby="budget-overview-title" className="rounded-xl border border-line bg-white p-5 sm:p-6">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <h2 id="budget-overview-title" className="text-base font-semibold text-ink">Budget overview</h2>
          <p className="mt-1 text-xs text-muted">{month ? monthLabel(month) : 'Monthly spending plans'}</p>
        </div>
        <Link
          to="/budgets"
          className="inline-flex min-h-10 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-brand-dark hover:bg-brand-soft"
        >
          All budgets <span aria-hidden="true">→</span>
        </Link>
      </div>
      {loading ? (
        <div className="grid min-h-32 place-items-center text-sm text-muted" role="status">Loading budgets…</div>
      ) : overview.length > 0 ? (
        <ul className="divide-y divide-line">
          {overview.map((budget) => (
            <BudgetLine
              key={budget.id}
              name={budget.name}
              limit={budget.limit}
              spent={budget.spent}
            />
          ))}
        </ul>
      ) : (
        <EmptyState
          icon={Tags}
          title="No budgets for this month"
          description="Create an overall or category plan to track spending."
        />
      )}
    </section>
  )
}
