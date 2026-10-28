import { useEffect, useRef, useState } from 'react'
import { Link, Outlet } from 'react-router-dom'
import { Settings2 } from 'lucide-react'
import MobileNavigation from '../components/layout/MobileNavigation.jsx'
import Sidebar from '../components/layout/Sidebar.jsx'
import BrandMark from '../components/ui/BrandMark.jsx'
import SignOutButton from '../components/auth/SignOutButton.jsx'
import OnboardingGuide from '../components/onboarding/OnboardingGuide.jsx'
import { useAuth } from '../contexts/authContext.js'

export default function MainLayout() {
  const { profile, user } = useAuth()
  const [accountMenuOpen, setAccountMenuOpen] = useState(false)
  const accountMenuRef = useRef(null)
  const initials = (profile?.display_name || user?.email || 'P')
    .trim()
    .slice(0, 1)
    .toUpperCase()
  const accountLabel = profile?.display_name || user?.email || 'Account'

  useEffect(() => {
    if (!accountMenuOpen) return undefined

    function closeOnOutsideClick(event) {
      if (!accountMenuRef.current?.contains(event.target)) setAccountMenuOpen(false)
    }

    function closeOnEscape(event) {
      if (event.key === 'Escape') setAccountMenuOpen(false)
    }

    document.addEventListener('pointerdown', closeOnOutsideClick)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [accountMenuOpen])

  return (
    <div className="min-h-screen bg-canvas">
      <Sidebar />
      <div className="min-h-screen min-h-dvh lg:pl-[248px]">
        <header className="sticky top-0 z-20 flex min-h-14 items-center justify-between border-b border-line bg-white/95 px-4 pt-[env(safe-area-inset-top)] backdrop-blur sm:px-7 lg:hidden">
          <div className="flex items-center gap-2.5">
            <BrandMark compact />
            <span>
              <span className="block text-sm font-semibold leading-tight text-ink">
                Pondo
              </span>
              <span className="mt-0.5 block text-[10px] leading-tight text-muted">
                Your Money, in Balance.
              </span>
            </span>
          </div>
          <div className="relative" ref={accountMenuRef}>
            <button
              type="button"
              aria-label={`Account options for ${accountLabel}`}
              aria-haspopup="menu"
              aria-expanded={accountMenuOpen}
              onClick={() => setAccountMenuOpen((open) => !open)}
              className="grid size-10 place-items-center rounded-full border border-line bg-canvas text-xs font-semibold text-brand-dark transition hover:bg-brand-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            >
              {initials}
            </button>
            {accountMenuOpen && (
              <div
                aria-label="Account options"
                className="absolute right-0 top-full z-40 mt-2 w-52 rounded-xl border border-line bg-white p-2 shadow-lg"
              >
                <Link
                  to="/settings"
                  onClick={() => setAccountMenuOpen(false)}
                  className="flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium text-ink transition-colors hover:bg-canvas"
                >
                  <Settings2 aria-hidden="true" size={17} className="text-muted" />
                  Settings
                </Link>
                <div className="my-1 border-t border-line" />
                <SignOutButton menuItem />
              </div>
            )}
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1440px] px-4 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-5 sm:px-7 sm:pb-28 sm:pt-8 lg:px-10 lg:pb-10 lg:pt-10">
          <Outlet />
        </main>
      </div>
      <MobileNavigation />
      {user?.id && <OnboardingGuide userId={user.id} />}
    </div>
  )
}
