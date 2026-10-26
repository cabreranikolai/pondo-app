import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/authContext.js'
import { supabase } from '../lib/supabase.js'
import { authErrorMessage } from '../lib/authMessages.js'
import AuthFeedback from '../components/auth/AuthFeedback.jsx'
import AuthField from '../components/auth/AuthField.jsx'
import AuthLayout from '../components/auth/AuthLayout.jsx'

export default function Login() {
  const { user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [resendBusy, setResendBusy] = useState(false)
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
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })
      if (signInError) throw signInError
      navigate(location.state?.from?.pathname || '/', { replace: true })
    } catch (submitError) {
      setError(authErrorMessage(submitError, 'Unable to sign in. Check your details and try again.'))
    } finally {
      setBusy(false)
    }
  }

  async function resendConfirmation() {
    if (resendBusy) return
    const normalizedEmail = email.trim().toLowerCase()
    if (!normalizedEmail) {
      setError('Enter your email address first.')
      return
    }

    setResendBusy(true)
    setError('')
    setSuccess('')
    try {
      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email: normalizedEmail,
        options: {
          emailRedirectTo: new URL('/auth/callback', window.location.origin).toString(),
        },
      })
      if (resendError) throw resendError
      setSuccess('Supabase accepted the confirmation request. Check your email inbox and spam folder.')
    } catch (resendError) {
      setError(authErrorMessage(resendError, 'Unable to request another confirmation email. Try again later.'))
    } finally {
      setResendBusy(false)
    }
  }

  return (
    <AuthLayout
      eyebrow="Welcome back"
      title="Sign in to Pondo"
      description="Use your email and password to continue to your account."
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
        <AuthField
          label="Password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        <div className="flex justify-end">
          <Link to="/forgot-password" className="text-sm font-medium text-brand hover:underline">
            Forgot password?
          </Link>
        </div>
        <button
          type="submit"
          disabled={busy}
          className="min-h-11 w-full rounded-lg bg-brand px-4 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:cursor-wait disabled:opacity-60"
        >
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
        {error === 'Confirm your email address before signing in.' && (
          <button
            type="button"
            onClick={resendConfirmation}
            disabled={resendBusy}
            className="min-h-10 w-full rounded-lg border border-line px-4 text-sm font-semibold text-brand transition hover:bg-brand-soft disabled:opacity-60"
          >
            {resendBusy ? 'Requesting…' : 'Resend confirmation email'}
          </button>
        )}
      </form>
      <p className="mt-5 text-center text-sm text-muted">
        New to Pondo?{' '}
        <Link to="/register" className="font-semibold text-brand hover:underline">
          Create an account
        </Link>
      </p>
    </AuthLayout>
  )
}
