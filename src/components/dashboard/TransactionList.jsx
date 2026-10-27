import { ArrowRightLeft } from 'lucide-react'
import { Link } from 'react-router-dom'
import EmptyState from '../ui/EmptyState.jsx'
import TransactionRow from './TransactionRow.jsx'

export default function TransactionList({ transactions = [], loading = false }) {
  return (
    <section aria-labelledby="recent-transactions-title" className="rounded-xl border border-line bg-white p-5 sm:p-6">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <h2 id="recent-transactions-title" className="text-base font-semibold text-ink">
            Recent transactions
          </h2>
          <p className="mt-1 text-xs text-muted">Your latest activity</p>
        </div>
        <Link
          to="/transactions"
          className="inline-flex min-h-10 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-brand-dark hover:bg-brand-soft"
        >
          View all <span aria-hidden="true">→</span>
        </Link>
      </div>
      {loading ? (
        <div className="grid min-h-40 place-items-center text-sm text-muted" role="status">Loading recent activity…</div>
      ) : transactions.length > 0 ? (
        <ul className="divide-y divide-line">
          {transactions.map((transaction) => (
            <TransactionRow key={transaction.transaction_id} transaction={transaction} />
          ))}
        </ul>
      ) : (
        <EmptyState
          icon={ArrowRightLeft}
          title="No transactions yet"
          description="Your recent activity will appear here."
        />
      )}
    </section>
  )
}
