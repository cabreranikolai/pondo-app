import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AuthLayout from '../components/auth/AuthLayout.jsx'
import AuthFeedback from '../components/auth/AuthFeedback.jsx'
import { supabase } from '../lib/supabase.js'

export default function AuthCallback() {
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const [working, setWorking] = useState(true)

  useEffect(() => {
    const url = new URL(window.location.href)
    const invitationToken =
      new URLSearchParams(url.hash.slice(1)).get('invitation') || ''
    const code = url.searchParams.get('code')

    window.history.replaceState(null, '', url.pathname)

    let active = true
    async function completeCallback() {
      try {
        if (code) {
          const { error: exchangeError } =
            await supabase.auth.exchangeCodeForSession(code)
          if (exchangeError) throw exchangeError
        }

        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession()
        if (sessionError) throw sessionError
        if (!session) {
          throw new Error('The verification link is invalid or has expired. Request a new link.')
        }

        if (invitationToken) {
          const { data, error: invitationError } = await supabase.rpc(
            'accept_invitation',
            { p_token: invitationToken },
          )
          if (invitationError || data !== true) {
            throw new Error(
              'The account is verified, but this invitation is invalid, expired, already used, or belongs to another email address.',
            )
          }
        }

        if (active) navigate('/', { replace: true })
      } catch (callbackError) {
        if (active) {
          setError(
            callbackError instanceof Error
              ? callbackError.message
              : 'Unable to finish verification. Request a new link and try again.',
          )
          setWorking(false)
        }
      }
    }

    completeCallback()
    return () => {
      active = false
    }
  }, [navigate])

  return (
    <AuthLayout
      eyebrow="Email verification"
      title={working ? 'Finishing verification' : 'Verification could not be completed'}
      description={
        working
          ? 'Please wait while we securely verify your account.'
          : 'Your link may have expired, or an invitation may not match this email.'
      }
    >
      {working ? (
        <p className="text-sm text-muted" role="status" aria-live="polite">
          Verifying…
        </p>
      ) : (
        <>
          <AuthFeedback error={error} />
          <Link to="/login" className="mt-4 inline-block text-sm font-semibold text-brand hover:underline">
            Return to sign in
          </Link>
        </>
      )}
    </AuthLayout>
  )
}
