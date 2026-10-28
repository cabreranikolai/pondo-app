import { useEffect, useRef, useState } from 'react'
import { LogOut, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/authContext.js'

export default function SignOutButton({ className = '', menuItem = false }) {
  const { signOut } = useAuth()
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [confirming, setConfirming] = useState(false)
  const cancelRef = useRef(null)
  const dialogRef = useRef(null)

  useEffect(() => {
    if (confirming) cancelRef.current?.focus()
  }, [confirming])

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
    <>
      <div className={className}>
        <button
          type="button"
          onClick={() => {
            setError('')
            setConfirming(true)
          }}
          aria-label="Sign out"
          className={
            menuItem
              ? 'flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-sm font-medium text-danger transition-colors hover:bg-danger-soft disabled:opacity-60'
              : 'flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm font-medium text-muted transition-colors hover:bg-canvas hover:text-ink disabled:opacity-60'
          }
        >
          <LogOut aria-hidden="true" size={17} />
          Sign out
        </button>
        {error && <p className="mt-1 text-xs text-danger" role="alert">{error}</p>}
      </div>

      {confirming && (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-ink/50 p-0 sm:items-center sm:p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !busy) setConfirming(false)
          }}
          onKeyDown={(event) => {
            if (event.key === 'Escape' && !busy) setConfirming(false)
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="sign-out-dialog-title"
            aria-describedby="sign-out-dialog-description"
            ref={dialogRef}
            onKeyDown={(event) => {
              if (event.key !== 'Tab' || !dialogRef.current) return
              const focusable = [...dialogRef.current.querySelectorAll(
                'button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled)',
              )]
              if (!focusable.length) return
              const first = focusable[0]
              const last = focusable[focusable.length - 1]
              if (event.shiftKey && document.activeElement === first) {
                event.preventDefault()
                last.focus()
              } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault()
                first.focus()
              }
            }}
            className="w-full rounded-t-2xl bg-white p-5 shadow-xl sm:max-w-sm sm:rounded-2xl sm:p-6"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="sign-out-dialog-title" className="text-lg font-semibold text-ink">
                  Sign out of Pondo?
                </h2>
                <p id="sign-out-dialog-description" className="mt-2 text-sm leading-6 text-muted">
                  You can sign back in anytime to access your workspace.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                disabled={busy}
                aria-label="Close sign out confirmation"
                className="grid size-9 shrink-0 place-items-center rounded-lg text-muted hover:bg-canvas disabled:opacity-50"
              >
                <X aria-hidden="true" size={18} />
              </button>
            </div>
            {error && <p className="mt-3 text-sm text-danger" role="alert">{error}</p>}
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                ref={cancelRef}
                type="button"
                onClick={() => setConfirming(false)}
                disabled={busy}
                className="min-h-11 rounded-lg border border-line px-4 text-sm font-semibold text-muted hover:bg-canvas disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSignOut}
                disabled={busy}
                className="min-h-11 rounded-lg bg-danger px-4 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-wait disabled:opacity-60"
              >
                {busy ? 'Signing out…' : 'Sign out'}
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  )
}
