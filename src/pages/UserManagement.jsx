import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import AuthFeedback from '../components/auth/AuthFeedback.jsx'
import AuthField from '../components/auth/AuthField.jsx'
import ConfirmDialog from '../components/ui/ConfirmDialog.jsx'
import PageHeader from '../components/ui/PageHeader.jsx'
import { useAuth } from '../contexts/authContext.js'
import { supabase } from '../lib/supabase.js'

function formatDate(value) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

export default function UserManagement() {
  const { user: currentUser } = useAuth()
  const [profiles, setProfiles] = useState([])
  const [profilesError, setProfilesError] = useState('')
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [inviteBusy, setInviteBusy] = useState(false)
  const [inviteError, setInviteError] = useState('')
  const [inviteSuccess, setInviteSuccess] = useState('')
  const [actionError, setActionError] = useState('')
  const [busyId, setBusyId] = useState('')
  const [pendingRoleChange, setPendingRoleChange] = useState(null)

  const loadManagementData = useCallback(async () => {
    const profileResult = await supabase
      .from('profiles')
      .select('id, display_name, role, created_at')
      .order('created_at', { ascending: false })

    if (profileResult.error) {
      setProfilesError('Unable to load user profiles. Confirm administrator authorization.')
      setProfiles([])
    } else {
      setProfilesError('')
      setProfiles(profileResult.data || [])
    }

    setLoading(false)
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadManagementData()
    }, 0)
    return () => window.clearTimeout(timer)
  }, [loadManagementData])

  async function sendInvitation(event) {
    event.preventDefault()
    if (inviteBusy) return

    const normalizedEmail = email.trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setInviteError('Enter a valid email address.')
      return
    }

    setInviteBusy(true)
    setInviteError('')
    setInviteSuccess('')
    try {
      const { data, error } = await supabase.functions.invoke('send-invitation', {
        body: { email: normalizedEmail },
      })
      if (error) {
        throw new Error(
          'The invitation service is unavailable. Deploy and configure the send-invitation Edge Function before inviting users.',
        )
      }
      if (!data?.invitationId) {
        throw new Error('The invitation service returned an invalid response.')
      }

      setEmail('')
      setInviteSuccess(
        `Invitation email sent. It expires ${formatDate(data.expiresAt)}.`,
      )
      setLoading(true)
      await loadManagementData()
    } catch (error) {
      setInviteError(
        error instanceof Error ? error.message : 'Unable to send the invitation.',
      )
    } finally {
      setInviteBusy(false)
    }
  }

  async function changeRole(profile, nextRole) {
    if (busyId || profile.id === currentUser?.id || profile.role === nextRole) return

    setBusyId(profile.id)
    setActionError('')
    try {
      const { error } = await supabase.rpc('admin_set_profile_role', {
        p_user_id: profile.id,
        p_role: nextRole,
      })
      if (error) throw error
      setLoading(true)
      await loadManagementData()
    } catch {
      setActionError('Unable to update this role. Confirm your administrator session and try again.')
    } finally {
      setBusyId('')
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Administration"
        title="User management"
        description="Manage Pondo profiles and invitations. Administrative access does not include users’ financial records."
        action={
          <Link
            to="/settings"
            className="inline-flex min-h-10 items-center rounded-lg border border-line bg-white px-3 text-sm font-medium text-muted hover:text-ink"
          >
            Settings
          </Link>
        }
      />

      <section className="mb-6 rounded-xl border border-line bg-white p-5 sm:p-6">
        <h2 className="text-sm font-semibold text-ink">Invite an end user</h2>
        <p className="mt-1 text-sm leading-6 text-muted">
          Invitations always grant the END_USER role. The email is delivered by a
          server-side function; the invitation token is never shown in this page.
        </p>
        <form onSubmit={sendInvitation} className="mt-4 flex flex-col gap-3 sm:max-w-xl sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1">
            <AuthField
              label="Email address"
              type="email"
              autoComplete="email"
              inputMode="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>
          <button
            type="submit"
            disabled={inviteBusy}
            className="min-h-11 rounded-lg bg-brand px-4 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:cursor-wait disabled:opacity-60"
          >
            {inviteBusy ? 'Sending…' : 'Send invitation'}
          </button>
        </form>
        <div className="mt-3">
          <AuthFeedback error={inviteError} success={inviteSuccess} />
        </div>
      </section>

      <section className="mb-6 rounded-xl border border-line bg-white p-5 sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-ink">Profiles</h2>
            <p className="mt-1 text-sm text-muted">
              Authentication status is not exposed by the current profile schema.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setLoading(true)
              setProfilesError('')
              loadManagementData()
            }}
            disabled={loading}
            className="min-h-10 rounded-lg border border-line px-3 text-sm font-medium text-muted hover:bg-canvas disabled:opacity-60"
          >
            Refresh
          </button>
        </div>
        <AuthFeedback error={profilesError || actionError} />
        {loading ? (
          <p className="py-6 text-sm text-muted" role="status">Loading profiles…</p>
        ) : profiles.length === 0 && !profilesError ? (
          <p className="py-6 text-sm text-muted">No profiles found.</p>
        ) : (
          <ul className="divide-y divide-line">
            {profiles.map((profile) => (
              <li
                key={profile.id}
                className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink">
                    {profile.display_name || 'Name not provided'}
                    {profile.id === currentUser?.id && (
                      <span className="ml-2 text-xs font-normal text-muted">(you)</span>
                    )}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    Profile created {formatDate(profile.created_at)}
                  </p>
                </div>
                <div className="flex items-center justify-between gap-3 sm:justify-end">
                  <span className="rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold text-brand-dark">
                    {profile.role}
                  </span>
                  {profile.id === currentUser?.id ? (
                    <span className="text-xs text-muted">Current administrator</span>
                  ) : (
                    <select
                      aria-label={`Change role for ${profile.display_name || 'user'}`}
                      value={profile.role}
                      disabled={busyId === profile.id}
                      onChange={(event) => setPendingRoleChange({ profile, role: event.target.value })}
                      className="min-h-10 rounded-lg border border-line bg-white px-2 text-xs text-ink disabled:opacity-60"
                    >
                      <option value="END_USER">END_USER</option>
                      <option value="SUPERADMIN">SUPERADMIN</option>
                    </select>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {pendingRoleChange && (
        <ConfirmDialog
          title={pendingRoleChange.role === 'SUPERADMIN' ? 'Promote this user?' : 'Remove administrator access?'}
          description={
            pendingRoleChange.role === 'SUPERADMIN'
              ? `Promote ${pendingRoleChange.profile.display_name || 'this user'} to superadmin? They will have full administrative access.`
              : `Change ${pendingRoleChange.profile.display_name || 'this user'} to end user? They will lose administrator access.`
          }
          confirmLabel={pendingRoleChange.role === 'SUPERADMIN' ? 'Promote to superadmin' : 'Change to end user'}
          destructive={pendingRoleChange.role !== 'SUPERADMIN'}
          busy={busyId === pendingRoleChange.profile.id}
          onCancel={() => setPendingRoleChange(null)}
          onConfirm={() => {
            const { profile, role } = pendingRoleChange
            void changeRole(profile, role)
          }}
        />
      )}
    </>
  )
}
