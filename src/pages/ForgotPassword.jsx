import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/authContext.js'
import { supabase } from '../lib/supabase.js'
import { authErrorMessage } from '../lib/authMessages.js'
import AuthFeedback from '../components/auth/AuthFeedback.jsx'
import AuthField from '../components/auth/AuthField.jsx'
import AuthLayout from '../components/auth/AuthLayout.jsx'

export default function ForgotPassword() {
  const { user } = useAuth()
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  if (user) return <Navigate to="/" replace />

  async function handleSubmit(event) {
    event.preventDefault()
    if (busy) return

    setBusy(true)
    setError('')
    setSuccess('')
    try {
      const redirectTo = new URL('/reset-password', window.location.origin).toString()
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email.trim().toLowerCase(),
        { redirectTo },
      )
      if (resetError) throw resetError
      setSuccess('If an account exists for that address, a password reset email has been requested.')
    } catch (submitError) {
      setError(authErrorMessage(submitError, 'Unable to request a password reset. Please try again later.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthLayout
      eyebrow="Account recovery"
      title="Reset your password"
      description="Enter the email address on your account. Supabase will handle the recovery email."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <AuthFeedback error={error} success={success} />
        <AuthField
          label="Email address"
          type="email"
          autoComplete="email"
          inputMode="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <button
          type="submit"
          disabled={busy}
          className="min-h-11 w-full rounded-lg bg-brand px-4 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:cursor-wait disabled:opacity-60"
        >
          {busy ? 'Requesting…' : 'Send recovery email'}
        </button>
      </form>
      <p className="mt-5 text-center text-sm text-muted">
        <Link to="/login" className="font-semibold text-brand hover:underline">
          Back to sign in
        </Link>
      </p>
    </AuthLayout>
  )
}
