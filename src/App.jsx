import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import MainLayout from './layouts/MainLayout.jsx'

const Accounts = lazy(() => import('./pages/Accounts.jsx'))
const Budgets = lazy(() => import('./pages/Budgets.jsx'))
const Dashboard = lazy(() => import('./pages/Dashboard.jsx'))
const NotFound = lazy(() => import('./pages/NotFound.jsx'))
const Reports = lazy(() => import('./pages/Reports.jsx'))
const Settings = lazy(() => import('./pages/Settings.jsx'))
const Transactions = lazy(() => import('./pages/Transactions.jsx'))

export default function App() {
  return (
    <Suspense
      fallback={
        <div
          role="status"
          aria-live="polite"
          className="grid min-h-screen place-items-center text-sm text-muted"
        >
          Loading your budget…
        </div>
      }
    >
      <Routes>
        <Route element={<MainLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="accounts" element={<Accounts />} />
          <Route path="transactions" element={<Transactions />} />
          <Route path="budgets" element={<Budgets />} />
          <Route path="reports" element={<Reports />} />
          <Route path="settings" element={<Settings />} />
          <Route path="404" element={<NotFound />} />
          <Route path="*" element={<Navigate to="/404" replace />} />
        </Route>
      </Routes>
    </Suspense>
  )
}
