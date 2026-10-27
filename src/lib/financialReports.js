import { toCents } from './money.js'
import { supabase } from './supabase.js'

export function currentMonthKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

export function shiftMonth(monthKey, offset) {
  const [year, month] = monthKey.split('-').map(Number)
  const date = new Date(year, month - 1 + offset, 1)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

export function monthStart(monthKey) {
  const [year, month] = monthKey.split('-').map(Number)
  return new Date(year, month - 1, 1).toISOString()
}

export function monthLabel(monthKey, options = { month: 'long', year: 'numeric' }) {
  const [year, month] = monthKey.split('-').map(Number)
  return new Intl.DateTimeFormat('en-PH', options).format(new Date(year, month - 1, 1))
}

export async function fetchMonthlyReport(startMonth, endMonthExclusive) {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  const { data, error } = await supabase.rpc('get_financial_report', {
    p_start: monthStart(startMonth),
    p_end: monthStart(endMonthExclusive),
    p_timezone: timezone,
  })

  if (error) throw error
  return data || []
}

export function activityTotals(rows) {
  return rows.reduce(
    (totals, row) => ({
      income: totals.income + (toCents(row.income_amount, null) ?? 0n),
      expenses: totals.expenses + (toCents(row.expense_amount, null) ?? 0n),
    }),
    { income: 0n, expenses: 0n },
  )
}

export function monthActivity(rows, monthKey) {
  return activityTotals(rows.filter((row) => row.month === `${monthKey}-01`))
}

export function categoryExpenses(rows, monthKey) {
  const categories = new Map()
  for (const row of rows) {
    if (row.month !== `${monthKey}-01`) continue
    const key = row.category_id || 'uncategorized'
    const current = categories.get(key)
    const spent = toCents(row.expense_amount, null) ?? 0n
    if (current) {
      current.spent += spent
    } else {
      categories.set(key, {
        id: row.category_id,
        name: row.category_name || 'Uncategorized',
        spent,
      })
    }
  }
  return [...categories.values()].filter((item) => item.spent > 0n)
}

export function monthlyTrend(rows, monthKeys) {
  return monthKeys.map((month) => {
    const totals = monthActivity(rows, month)
    return {
      month: monthLabel(month, { month: 'short' }),
      monthKey: month,
      incomeCentavos: Number(totals.income),
      expensesCentavos: Number(totals.expenses),
    }
  })
}
