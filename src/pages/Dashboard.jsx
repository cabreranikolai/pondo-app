import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Scale,
  Wallet,
} from 'lucide-react'
import BudgetOverview from '../components/dashboard/BudgetOverview.jsx'
import MonthlyOverviewChart from '../components/dashboard/MonthlyOverviewChart.jsx'
import SummaryCard from '../components/dashboard/SummaryCard.jsx'
import TransactionList from '../components/dashboard/TransactionList.jsx'
import PageHeader from '../components/ui/PageHeader.jsx'
import { financialSummary } from '../constants/mockData.js'
import { formatCurrentDate, formatPHP } from '../lib/formatters.js'

export default function Dashboard() {
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
      amount: formatPHP(financialSummary.totalBalanceCentavos),
      icon: Wallet,
      detail: 'Across your accounts',
      tone: 'default',
    },
    {
      label: 'Monthly income',
      amount: formatPHP(financialSummary.monthlyIncomeCentavos),
      icon: ArrowDownToLine,
      detail: 'This October',
      tone: 'positive',
    },
    {
      label: 'Monthly expenses',
      amount: formatPHP(financialSummary.monthlyExpensesCentavos),
      icon: ArrowUpFromLine,
      detail: 'This October',
      tone: 'negative',
    },
    {
      label: 'Net cash flow',
      amount: formatPHP(financialSummary.netCashFlowCentavos),
      icon: Scale,
      detail: 'Income minus expenses',
      tone: 'positive',
    },
  ]

  return (
    <>
      <PageHeader
        eyebrow={formatCurrentDate(currentDate)}
        title={greeting}
        description="Here’s a clear look at your money this month."
      />
      <section aria-label="Financial summary" className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        {summaryCards.map((card) => (
          <SummaryCard key={card.label} {...card} />
        ))}
      </section>
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,1fr)]">
        <div className="space-y-5">
          <MonthlyOverviewChart />
          <TransactionList />
        </div>
        <BudgetOverview />
      </div>
    </>
  )
}
