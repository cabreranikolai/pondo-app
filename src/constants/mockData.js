export const monthlyOverview = [
  { month: 'May', incomeCentavos: 7350000, expensesCentavos: 4280000 },
  { month: 'Jun', incomeCentavos: 7620000, expensesCentavos: 4610000 },
  { month: 'Jul', incomeCentavos: 7480000, expensesCentavos: 4390000 },
  { month: 'Aug', incomeCentavos: 8100000, expensesCentavos: 4920000 },
  { month: 'Sep', incomeCentavos: 7900000, expensesCentavos: 4750000 },
  { month: 'Oct', incomeCentavos: 8250000, expensesCentavos: 5180000 },
]

export const financialSummary = {
  totalBalanceCentavos: 18427500,
  monthlyIncomeCentavos: 8250000,
  monthlyExpensesCentavos: 5180000,
  netCashFlowCentavos: 3070000,
}

export const recentTransactions = [
  {
    id: 'tx-1',
    description: 'Monthly salary',
    category: 'Salary',
    account: 'BPI Savings',
    date: '2026-10-25',
    type: 'income',
    amountCentavos: 7200000,
    icon: 'briefcase',
  },
  {
    id: 'tx-2',
    description: 'Weekly groceries',
    category: 'Groceries',
    account: 'GCash',
    date: '2026-10-24',
    type: 'expense',
    amountCentavos: 384500,
    icon: 'shopping',
  },
  {
    id: 'tx-3',
    description: 'Electricity bill',
    category: 'Utilities',
    account: 'BPI Savings',
    date: '2026-10-22',
    type: 'expense',
    amountCentavos: 276800,
    icon: 'bolt',
  },
  {
    id: 'tx-4',
    description: 'Freelance project',
    category: 'Side income',
    account: 'BPI Savings',
    date: '2026-10-20',
    type: 'income',
    amountCentavos: 1050000,
    icon: 'laptop',
  },
  {
    id: 'tx-5',
    description: 'Dinner with friends',
    category: 'Dining',
    account: 'GCash',
    date: '2026-10-19',
    type: 'expense',
    amountCentavos: 168000,
    icon: 'utensils',
  },
]

export const budgets = [
  {
    id: 'budget-1',
    category: 'Groceries',
    spentCentavos: 1285000,
    limitCentavos: 1800000,
  },
  {
    id: 'budget-2',
    category: 'Dining out',
    spentCentavos: 920000,
    limitCentavos: 1000000,
  },
  {
    id: 'budget-3',
    category: 'Transport',
    spentCentavos: 632000,
    limitCentavos: 900000,
  },
  {
    id: 'budget-4',
    category: 'Shopping',
    spentCentavos: 860000,
    limitCentavos: 800000,
  },
]

export const illustrativeNotice =
  'Illustrative data only. These figures are fictional and are not connected to a bank or account.'
