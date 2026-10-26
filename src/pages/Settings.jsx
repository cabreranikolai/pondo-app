import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Settings2 } from 'lucide-react'
import AuthFeedback from '../components/auth/AuthFeedback.jsx'
import AuthField from '../components/auth/AuthField.jsx'
import EmptyState from '../components/ui/EmptyState.jsx'
import PageHeader from '../components/ui/PageHeader.jsx'
import { useAuth } from '../contexts/authContext.js'
import { supabase } from '../lib/supabase.js'

export default function Settings() {
  const { profile, profileStatus, refreshProfile, user } = useAuth()
  const [displayName, setDisplayName] = useState(profile?.display_name || '')
  const [profileBusy, setProfileBusy] = useState(false)
  const [profileError, setProfileError] = useState('')
  const [profileSuccess, setProfileSuccess] = useState('')
  const [connection, setConnection] = useState({
    status: 'checking',
    clientInitialized: false,
    message: '',
  })

  useEffect(() => {
    let cancelled = false

    async function checkConnection() {
      let clientInitialized = false
      try {
        const { checkSupabaseConnection } = await import('../lib/supabase.js')
        if (cancelled) return

        clientInitialized = true
        setConnection((current) => ({ ...current, clientInitialized: true }))
        await checkSupabaseConnection()

        if (!cancelled) {
          setConnection({
            status: 'connected',
            clientInitialized: true,
            message: '',
          })
        }
      } catch (error) {
        if (!cancelled) {
          setConnection({
            status: 'failed',
            clientInitialized,
            message:
              error instanceof Error
                ? error.message
                : 'Unable to initialize the Supabase client.',
          })
        }
      }
    }

    checkConnection()
    return () => {
      cancelled = true
    }
  }, [])

  async function saveProfile(event) {
    event.preventDefault()
    if (profileBusy || !user) return

    const normalizedName = displayName.trim()
    if (normalizedName.length > 80) {
      setProfileError('Display name must be 80 characters or fewer.')
      return
    }

    setProfileBusy(true)
    setProfileError('')
    setProfileSuccess('')
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({ display_name: normalizedName || null })
        .eq('id', user.id)
        .select('id')
        .maybeSingle()

      if (error) throw error
      if (!data) throw new Error('The profile could not be updated.')
      await refreshProfile()
      setProfileSuccess('Your display name has been updated.')
    } catch {
      setProfileError('Unable to update your profile. Check your connection and try again.')
    } finally {
      setProfileBusy(false)
    }
  }

  const isConnected = connection.status === 'connected'
  const isChecking = connection.status === 'checking'

  return (
    <>
      <PageHeader
        eyebrow="Preferences"
        title="Settings"
        description="Manage your profile and application preferences."
      />
      <section className="mb-6 rounded-xl border border-line bg-white p-5 sm:p-6">
        <div className="mb-5">
          <h2 className="text-sm font-semibold text-ink">Your profile</h2>
          <p className="mt-1 text-sm text-muted">
            Your email and account role are managed by Supabase and Pondo.
          </p>
        </div>
        <dl className="mb-5 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium text-muted">Email</dt>
            <dd className="mt-1 break-all text-ink">{user?.email || '—'}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-muted">Role</dt>
            <dd className="mt-1 text-ink">
              {profileStatus === 'ready'
                ? profile?.role === 'SUPERADMIN'
                  ? 'Superadmin'
                  : 'End user'
                : 'Unavailable'}
            </dd>
          </div>
        </dl>
        <form onSubmit={saveProfile} className="max-w-md space-y-4">
          <AuthField
            label="Display name"
            autoComplete="name"
            required={false}
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
          />
          <AuthFeedback error={profileError} success={profileSuccess} />
          <button
            type="submit"
            disabled={profileBusy || profileStatus !== 'ready'}
            className="min-h-10 rounded-lg bg-brand px-4 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60"
          >
            {profileBusy ? 'Saving…' : 'Save profile'}
          </button>
        </form>
        {profile?.role === 'SUPERADMIN' && (
          <Link
            to="/admin/users"
            className="mt-5 inline-flex min-h-10 items-center rounded-lg border border-line px-4 text-sm font-semibold text-brand hover:bg-brand-soft"
          >
            Open user management
          </Link>
        )}
      </section>
      <section
        aria-labelledby="supabase-connection-title"
        className="mb-6 rounded-xl border border-line bg-white p-5 sm:p-6"
      >
        <div className="flex items-start gap-3">
          <span
            aria-hidden="true"
            className={`mt-1.5 size-2.5 shrink-0 rounded-full ${
              isChecking
                ? 'bg-muted'
                : isConnected
                  ? 'bg-brand'
                  : 'bg-danger'
            }`}
          />
          <div>
            <h2 id="supabase-connection-title" className="text-sm font-semibold text-ink">
              Supabase connection
            </h2>
            <p className="mt-1 text-sm text-muted" role="status" aria-live="polite">
              {isChecking
                ? 'Checking connection…'
                : isConnected
                  ? 'Supabase connection successful'
                  : 'Unable to connect to Supabase'}
            </p>
            <p className="mt-2 text-xs leading-5 text-muted">
              {isChecking
                ? connection.clientInitialized
                  ? 'Client initialized; checking the Auth endpoint…'
                  : 'Initializing the Supabase client…'
                : isConnected
                  ? 'Client initialized; Auth endpoint responded successfully.'
                  : connection.message}
            </p>
          </div>
        </div>
      </section>
      <EmptyState
        icon={Settings2}
        title="Settings are not available yet"
        description="Profile and preference controls will be introduced in a future phase."
      />
    </>
  )
}
