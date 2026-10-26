import { Tags } from 'lucide-react'
import { Link } from 'react-router-dom'
import { budgets } from '../../constants/mockData.js'
import EmptyState from '../ui/EmptyState.jsx'
import BudgetProgress from './BudgetProgress.jsx'

export default function BudgetOverview() {
  return (
    <section aria-labelledby="budget-overview-title" className="rounded-xl border border-line bg-white p-5 sm:p-6">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <h2 id="budget-overview-title" className="text-base font-semibold text-ink">
            Budget overview
          </h2>
          <p className="mt-1 text-xs text-muted">October spending plans</p>
        </div>
        <Link
          to="/budgets"
          className="inline-flex min-h-10 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-brand-dark hover:bg-brand-soft"
        >
          All budgets <span aria-hidden="true">→</span>
        </Link>
      </div>
      {budgets.length > 0 ? (
        <ul className="divide-y divide-line">
          {budgets.map((budget) => (
            <BudgetProgress key={budget.id} budget={budget} />
          ))}
        </ul>
      ) : (
        <EmptyState
          icon={Tags}
          title="No budgets to show"
          description="Your monthly budget plans will appear here."
        />
      )}
    </section>
  )
}
