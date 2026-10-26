import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/authContext.js'
import { supabase } from '../lib/supabase.js'
import { authErrorMessage } from '../lib/authMessages.js'
import AuthFeedback from '../components/auth/AuthFeedback.jsx'
import AuthField from '../components/auth/AuthField.jsx'
import AuthLayout from '../components/auth/AuthLayout.jsx'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function Register() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const invitationRequestRef = useRef(null)
  const [invitationToken] = useState(() => {
    if (typeof window === 'undefined') return ''
    return new URLSearchParams(window.location.hash.slice(1)).get('invitation') || ''
  })
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [resendBusy, setResendBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    if (window.location.hash.includes('invitation=')) {
      window.history.replaceState(
        null,
        '',
        `${window.location.pathname}${window.location.search}`,
      )
    }
  }, [])

  useEffect(() => {
    if (!user || !invitationToken) return
    if (!invitationRequestRef.current) {
      invitationRequestRef.current = supabase.rpc('accept_invitation', {
        p_token: invitationToken,
      }).then(({ data, error: rpcError }) => {
        if (rpcError || data !== true) {
          throw new Error(
            'This invitation is invalid, expired, already used, or belongs to another email address.',
          )
        }
      })
    }

    let active = true
    invitationRequestRef.current
      .then(() => {
        if (!active) return
        setSuccess('Invitation accepted. Your account is ready.')
        navigate('/', { replace: true })
      })
      .catch((invitationError) => {
        if (active) {
          setError(
            invitationError instanceof Error
              ? invitationError.message
              : 'Unable to accept this invitation. Please request a new invitation.',
          )
        }
      })

    return () => {
      active = false
    }
  }, [user, invitationToken, navigate])

  if (user && !invitationToken) return <Navigate to="/" replace />

  async function handleSubmit(event) {
    event.preventDefault()
    if (busy) return

    const normalizedEmail = email.trim().toLowerCase()
    if (!EMAIL_PATTERN.test(normalizedEmail)) {
      setError('Enter a valid email address.')
      return
    }
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
      const emailRedirectTo = new URL('/auth/callback', window.location.origin)
      if (invitationToken) {
        emailRedirectTo.hash = new URLSearchParams({ invitation: invitationToken }).toString()
      }

      const { data, error: signUpError } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          data: { display_name: displayName.trim() || null },
          emailRedirectTo: emailRedirectTo.toString(),
        },
      })
      if (signUpError) throw signUpError

      if (data.session && invitationToken) {
        navigate(`/auth/callback#${new URLSearchParams({ invitation: invitationToken })}`, {
          replace: true,
        })
        return
      }

      setSuccess(
        data.session
          ? 'Your account is ready. You are signed in.'
          : 'Supabase accepted the registration request. If email confirmation is enabled, check your inbox for the verification link.',
      )
    } catch (submitError) {
      setError(authErrorMessage(submitError, 'Unable to create the account. Check your details and try again.'))
    } finally {
      setBusy(false)
    }
  }

  async function resendConfirmation() {
    if (resendBusy) return
    const normalizedEmail = email.trim().toLowerCase()
    if (!EMAIL_PATTERN.test(normalizedEmail)) {
      setError('Enter the email address used for registration.')
      return
    }

    setResendBusy(true)
    setError('')
    setSuccess('')
    try {
      const redirectTo = new URL('/auth/callback', window.location.origin)
      if (invitationToken) {
        redirectTo.hash = new URLSearchParams({ invitation: invitationToken }).toString()
      }

      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email: normalizedEmail,
        options: { emailRedirectTo: redirectTo.toString() },
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
      eyebrow={invitationToken ? 'You are invited' : 'Get started'}
      title="Create your account"
      description="Your account role is assigned securely by Pondo and cannot be selected here."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <AuthFeedback error={error} success={success} />
        <AuthField
          label="Display name"
          autoComplete="name"
          required={false}
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
        />
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
          autoComplete="new-password"
          minLength={12}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        <AuthField
          label="Confirm password"
          type="password"
          autoComplete="new-password"
          minLength={12}
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
        />
        <p className="text-xs leading-5 text-muted">
          Use at least 12 characters. Supabase email verification settings apply.
        </p>
        <button
          type="submit"
          disabled={busy}
          className="min-h-11 w-full rounded-lg bg-brand px-4 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:cursor-wait disabled:opacity-60"
        >
          {busy ? 'Creating account…' : 'Create account'}
        </button>
        {success && !user && (
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
        Already have an account?{' '}
        <Link to="/login" className="font-semibold text-brand hover:underline">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  )
}
