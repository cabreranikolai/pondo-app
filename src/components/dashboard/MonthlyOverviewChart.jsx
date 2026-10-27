import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatCompactPHP, formatPHP } from '../../lib/formatters.js'
import EmptyState from '../ui/EmptyState.jsx'

function ChartTooltip({ active, payload, label }) {
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

export default function MonthlyOverviewChart({ data = [], loading = false }) {
  return (
    <section aria-labelledby="monthly-overview-title" className="rounded-xl border border-line bg-white p-5 sm:p-6">
      <div className="mb-5">
        <h2 id="monthly-overview-title" className="text-base font-semibold text-ink">
          Income vs. expenses
        </h2>
        <p className="mt-1 text-xs text-muted">Income and expenses · Philippine pesos</p>
      </div>
      {loading ? (
        <div className="grid h-[250px] place-items-center text-sm text-muted" role="status">Loading report…</div>
      ) : data.length === 0 ? (
        <EmptyState
          title="No activity in this period"
          description="Income and expense totals will appear after you record transactions."
        />
      ) : (
        <div
          className="h-[250px] w-full sm:h-[290px]"
          role="img"
          aria-label="Bar chart comparing monthly income and expenses"
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 8, right: 2, left: -21, bottom: 0 }}
              barGap={4}
              barCategoryGap="28%"
            >
              <CartesianGrid vertical={false} stroke="#edf0ed" />
              <XAxis
                dataKey="month"
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'var(--pond-muted-gray)', fontSize: 11 }}
                dy={9}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'var(--pond-muted-gray)', fontSize: 10 }}
                tickFormatter={(value) => formatCompactPHP(value)}
                width={55}
              />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--pond-warm-ivory)' }} />
              <Legend
                verticalAlign="top"
                align="right"
                iconType="circle"
                iconSize={7}
                wrapperStyle={{ fontSize: '11px', paddingBottom: '12px' }}
              />
              <Bar
                name="Income"
                dataKey="incomeCentavos"
                fill="var(--pond-forest-green)"
                radius={[4, 4, 0, 0]}
                maxBarSize={22}
              />
              <Bar
                name="Expenses"
                dataKey="expensesCentavos"
                fill="var(--pond-expense-chart)"
                radius={[4, 4, 0, 0]}
                maxBarSize={22}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  )
}
