import {
  BarChart3,
  CreditCard,
  LayoutDashboard,
  Settings2,
  Tags,
  WalletCards,
} from 'lucide-react'

export const primaryNavigation = [
  { label: 'Overview', to: '/', icon: LayoutDashboard },
  { label: 'Accounts', to: '/accounts', icon: WalletCards },
  { label: 'Transactions', to: '/transactions', icon: CreditCard },
  { label: 'Budgets', to: '/budgets', icon: Tags },
  { label: 'Reports', to: '/reports', icon: BarChart3 },
]

export const secondaryNavigation = [
  { label: 'Settings', to: '/settings', icon: Settings2 },
]
