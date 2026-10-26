import { useState } from 'react'
import { LogOut } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/authContext.js'

export default function SignOutButton({ className = '' }) {
  const { signOut } = useAuth()
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function handleSignOut() {
    if (busy) return
    setBusy(true)
    setError('')
    try {
      await signOut()
      navigate('/login', { replace: true })
    } catch {
      setError('Unable to sign out. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={className}>
      <button
        type="button"
        onClick={handleSignOut}
        disabled={busy}
        aria-label={busy ? 'Signing out' : 'Sign out'}
        title={error || 'Sign out'}
        className="flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm font-medium text-muted transition-colors hover:bg-canvas hover:text-ink disabled:opacity-60"
      >
        <LogOut aria-hidden="true" size={17} />
        {busy ? 'Signing out…' : 'Sign out'}
      </button>
      {error && <p className="mt-1 text-xs text-danger" role="alert">{error}</p>}
    </div>
  )
}
