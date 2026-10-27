import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight, Bolt, BriefcaseBusiness, Laptop, ShoppingBasket, Utensils } from 'lucide-react'
import { formatCents, toCents } from '../../lib/money.js'

const transactionIcons = {
  briefcase: BriefcaseBusiness,
  shopping: ShoppingBasket,
  bolt: Bolt,
  laptop: Laptop,
  utensils: Utensils,
}

export default function TransactionRow({ transaction }) {
  const isIncome = transaction.type === 'INCOME' || transaction.type === 'income'
  const isTransfer = transaction.type === 'TRANSFER'
  const Icon = transactionIcons[transaction.icon] ?? ShoppingBasket
  const AmountIcon = isTransfer ? ArrowLeftRight : isIncome ? ArrowDownLeft : ArrowUpRight
  const amountCents =
    typeof transaction.amountCentavos === 'bigint'
      ? transaction.amountCentavos
      : transaction.amount !== undefined
        ? toCents(transaction.amount, null) ?? 0n
        : BigInt(Math.trunc(transaction.amountCentavos || 0))
  const transactionDate = transaction.transaction_date || transaction.date
  const date = new Date(transactionDate)
  const dateLabel = Number.isNaN(date.getTime())
    ? ''
    : new Intl.DateTimeFormat('en-PH', { day: 'numeric', month: 'short' }).format(date)

  return (
    <li className="flex items-center gap-3 py-3.5 first:pt-0 last:pb-0 sm:gap-4">
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-canvas text-ink">
        <Icon aria-hidden="true" size={18} strokeWidth={1.8} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-ink">
          {transaction.description || (isIncome ? 'Income' : isTransfer ? 'Transfer' : 'Expense')}
        </p>
        <p className="mt-1 truncate text-xs text-muted">
          {isTransfer
            ? `${transaction.from_account_name || 'Account'} → ${transaction.to_account_name || 'Account'}`
            : `${transaction.category_name || transaction.category || 'Uncategorized'} · ${transaction.account_name || transaction.account || 'Account'}`}
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p className={`flex items-center justify-end gap-1 text-sm font-semibold ${isIncome ? 'text-brand-dark' : isTransfer ? 'text-muted' : 'text-danger'}`}>
          <AmountIcon aria-hidden="true" size={14} />
          {isIncome ? '+' : isTransfer ? '' : '−'}
          {formatCents(amountCents)}
        </p>
        <time className="mt-1 block text-xs text-muted" dateTime={transactionDate}>
          {dateLabel}
        </time>
      </div>
    </li>
  )
}
