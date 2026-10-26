import { useState } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/authContext.js'
import AuthLayout from './AuthLayout.jsx'
import AuthFeedback from './AuthFeedback.jsx'
import SignOutButton from './SignOutButton.jsx'

function LoadingScreen({ children = 'Restoring your session…' }) {
  return (
    <div className="grid min-h-screen place-items-center px-5 text-center text-sm text-muted">
      <p role="status" aria-live="polite">{children}</p>
    </div>
  )
}

export function PublicOnly({ children, allowInvitation = false }) {
  const { user, sessionLoading } = useAuth()
  const hasInvitation = new URLSearchParams(window.location.hash.slice(1)).has('invitation')

  if (sessionLoading) return <LoadingScreen />
  if (user && !(allowInvitation && hasInvitation)) return <Navigate to="/" replace />
  return children
}

export function RequireAuth() {
  const {
    user,
    profile,
    profileStatus,
    sessionLoading,
    refreshProfile,
  } = useAuth()
  const location = useLocation()

  if (sessionLoading) return <LoadingScreen />
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }
  if (profileStatus === 'loading' || profileStatus === 'idle') {
    return <LoadingScreen>Loading your profile…</LoadingScreen>
  }
  if (profileStatus === 'error') {
    return (
      <ProfileLoadError refreshProfile={refreshProfile} />
    )
  }
  if (!profile) {
    return (
      <AuthLayout
        eyebrow="Profile"
        title="Profile setup is incomplete"
        description="A profile was not found for this account. Pondo will not assign a role from the browser."
      >
        <p className="text-sm text-muted">
          Contact the project administrator to check the Auth profile-creation trigger.
        </p>
        <SignOutButton className="mt-4" />
      </AuthLayout>
    )
  }

  return <Outlet />
}

function ProfileLoadError({ refreshProfile }) {
  const [error, setError] = useState('Check your connection and try again.')
  const [busy, setBusy] = useState(false)

  async function retry() {
    setBusy(true)
    setError('')
    try {
      await refreshProfile()
    } catch {
      setError('The profile request failed. Check your connection and try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthLayout
      eyebrow="Profile"
      title="Unable to load your profile"
      description="Your profile could not be read. No profile has been created or changed automatically."
    >
      <AuthFeedback error={error} />
      <button
        type="button"
        onClick={retry}
        disabled={busy}
        className="mt-4 min-h-10 rounded-lg bg-brand px-4 text-sm font-semibold text-white disabled:opacity-60"
      >
        {busy ? 'Retrying…' : 'Retry profile'}
      </button>
      <SignOutButton className="mt-3" />
    </AuthLayout>
  )
}

export function RequireRole({ role, children }) {
  const { profile } = useAuth()
  if (profile?.role !== role) return <Navigate to="/" replace />
  return children
}
