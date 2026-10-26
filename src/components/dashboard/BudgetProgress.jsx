import { formatPHP } from '../../lib/formatters.js'

export default function BudgetProgress({ budget }) {
  const progress = (budget.spentCentavos / budget.limitCentavos) * 100
  const isOver = progress >= 100
  const isWarning = progress >= 80
  const color = isOver ? 'bg-danger' : isWarning ? 'bg-warning' : 'bg-brand'
  const textColor = isOver ? 'text-danger' : isWarning ? 'text-warning' : 'text-muted'
  const remainingCentavos = budget.limitCentavos - budget.spentCentavos

  return (
    <li className="py-4 first:pt-0 last:pb-0">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-ink">{budget.category}</p>
          <p className="mt-1 text-xs text-muted">
            {formatPHP(budget.spentCentavos)} <span aria-hidden="true">/</span>{' '}
            {formatPHP(budget.limitCentavos)}
          </p>
        </div>
        <p className={`shrink-0 text-right text-xs font-medium ${textColor}`}>
          {isOver ? 'Over by' : 'Left'}
          <span className="mt-1 block font-semibold">
            {formatPHP(Math.abs(remainingCentavos))}
          </span>
        </p>
      </div>
      <div
        className="mt-3 h-2 overflow-hidden rounded-full bg-canvas"
        role="progressbar"
        aria-label={`${budget.category} budget`}
        aria-valuemin={0}
        aria-valuenow={Math.min(Math.round(progress), 100)}
        aria-valuemax={100}
        aria-valuetext={`${Math.round(progress)} percent of budget used`}
      >
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
      </div>
      {isWarning && (
        <p className={`mt-2 text-xs font-medium ${textColor}`}>
          {isOver ? 'You have gone over this budget.' : 'You have used most of this budget.'}
        </p>
      )}
    </li>
  )
}
