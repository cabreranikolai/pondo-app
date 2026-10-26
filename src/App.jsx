import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { PublicOnly, RequireAuth, RequireRole } from './components/auth/RouteGuards.jsx'
import MainLayout from './layouts/MainLayout.jsx'

const AuthCallback = lazy(() => import('./pages/AuthCallback.jsx'))
const Accounts = lazy(() => import('./pages/Accounts.jsx'))
const Budgets = lazy(() => import('./pages/Budgets.jsx'))
const Dashboard = lazy(() => import('./pages/Dashboard.jsx'))
const ForgotPassword = lazy(() => import('./pages/ForgotPassword.jsx'))
const Login = lazy(() => import('./pages/Login.jsx'))
const NotFound = lazy(() => import('./pages/NotFound.jsx'))
const Register = lazy(() => import('./pages/Register.jsx'))
const Reports = lazy(() => import('./pages/Reports.jsx'))
const ResetPassword = lazy(() => import('./pages/ResetPassword.jsx'))
const Settings = lazy(() => import('./pages/Settings.jsx'))
const Transactions = lazy(() => import('./pages/Transactions.jsx'))
const UserManagement = lazy(() => import('./pages/UserManagement.jsx'))

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
        <Route path="login" element={<PublicOnly><Login /></PublicOnly>} />
        <Route path="register" element={<PublicOnly allowInvitation><Register /></PublicOnly>} />
        <Route path="forgot-password" element={<PublicOnly><ForgotPassword /></PublicOnly>} />
        <Route path="reset-password" element={<ResetPassword />} />
        <Route path="auth/callback" element={<AuthCallback />} />
        <Route element={<RequireAuth />}>
          <Route element={<MainLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="accounts" element={<Accounts />} />
            <Route path="transactions" element={<Transactions />} />
            <Route path="budgets" element={<Budgets />} />
            <Route path="reports" element={<Reports />} />
            <Route path="settings" element={<Settings />} />
            <Route
              path="admin/users"
              element={
                <RequireRole role="SUPERADMIN">
                  <UserManagement />
                </RequireRole>
              }
            />
            <Route path="404" element={<NotFound />} />
            <Route path="*" element={<Navigate to="/404" replace />} />
          </Route>
        </Route>
      </Routes>
    </Suspense>
  )
}
