import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/authContext.js'
import { supabase } from '../lib/supabase.js'
import { authErrorMessage } from '../lib/authMessages.js'
import AuthFeedback from '../components/auth/AuthFeedback.jsx'
import AuthField from '../components/auth/AuthField.jsx'
import AuthLayout from '../components/auth/AuthLayout.jsx'

export default function ResetPassword() {
  const { user, sessionLoading } = useAuth()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  if (sessionLoading) {
    return (
      <div className="grid min-h-screen place-items-center text-sm text-muted" role="status">
        Verifying your recovery link…
      </div>
    )
  }

  if (!user) {
    return (
      <AuthLayout
        eyebrow="Account recovery"
        title="Recovery link required"
        description="Open the latest password recovery email to choose a new password."
      >
        <Link to="/forgot-password" className="text-sm font-semibold text-brand hover:underline">
          Request another recovery email
        </Link>
      </AuthLayout>
    )
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (busy) return

    if (password.length < 12) {
      setError('Use a password with at least 12 characters.')
      return
    }
    if (password !== confirmPassword) {
      setError('The passwords do not match.')
      return
    }

    setBusy(true)
    setError('')
    setSuccess('')
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) throw updateError
      setSuccess('Your password has been updated.')
      setPassword('')
      setConfirmPassword('')
    } catch (submitError) {
      setError(authErrorMessage(submitError, 'Unable to update your password. Request a new recovery link and try again.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthLayout
      eyebrow="Account recovery"
      title="Choose a new password"
      description="Use at least 12 characters. Your password is managed by Supabase Auth."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <AuthFeedback error={error} success={success} />
        <AuthField
          label="New password"
          type="password"
          autoComplete="new-password"
          minLength={12}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        <AuthField
          label="Confirm new password"
          type="password"
          autoComplete="new-password"
          minLength={12}
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
        />
        <button
          type="submit"
          disabled={busy}
          className="min-h-11 w-full rounded-lg bg-brand px-4 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:cursor-wait disabled:opacity-60"
        >
          {busy ? 'Updating…' : 'Update password'}
        </button>
      </form>
      {success && (
        <Link to="/" className="mt-4 inline-block text-sm font-semibold text-brand hover:underline">
          Continue to Pondo
        </Link>
      )}
    </AuthLayout>
  )
}
