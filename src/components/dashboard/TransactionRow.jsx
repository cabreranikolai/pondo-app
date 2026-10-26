import { ArrowDownLeft, ArrowUpRight, Bolt, BriefcaseBusiness, Laptop, ShoppingBasket, Utensils } from 'lucide-react'
import { formatPHP, formatShortDate } from '../../lib/formatters.js'

const transactionIcons = {
  briefcase: BriefcaseBusiness,
  shopping: ShoppingBasket,
  bolt: Bolt,
  laptop: Laptop,
  utensils: Utensils,
}

export default function TransactionRow({ transaction }) {
  const isIncome = transaction.type === 'income'
  const Icon = transactionIcons[transaction.icon] ?? ShoppingBasket
  const AmountIcon = isIncome ? ArrowDownLeft : ArrowUpRight

  return (
    <li className="flex items-center gap-3 py-3.5 first:pt-0 last:pb-0 sm:gap-4">
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-canvas text-ink">
        <Icon aria-hidden="true" size={18} strokeWidth={1.8} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-ink">{transaction.description}</p>
        <p className="mt-1 truncate text-xs text-muted">
          {transaction.category} <span aria-hidden="true">·</span> {transaction.account}
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p className={`flex items-center justify-end gap-1 text-sm font-semibold ${isIncome ? 'text-brand-dark' : 'text-ink'}`}>
          <AmountIcon aria-hidden="true" size={14} />
          {isIncome ? '+' : '−'}
          {formatPHP(transaction.amountCentavos)}
        </p>
        <time className="mt-1 block text-xs text-muted" dateTime={transaction.date}>
          {formatShortDate(transaction.date)}
        </time>
      </div>
    </li>
  )
}
