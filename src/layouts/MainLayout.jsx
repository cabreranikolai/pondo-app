import { Link, Outlet } from 'react-router-dom'
import MobileNavigation from '../components/layout/MobileNavigation.jsx'
import Sidebar from '../components/layout/Sidebar.jsx'
import BrandMark from '../components/ui/BrandMark.jsx'
import SignOutButton from '../components/auth/SignOutButton.jsx'
import OnboardingGuide from '../components/onboarding/OnboardingGuide.jsx'
import { useAuth } from '../contexts/authContext.js'

export default function MainLayout() {
  const { profile, user } = useAuth()
  const initials = (profile?.display_name || user?.email || 'P')
    .trim()
    .slice(0, 1)
    .toUpperCase()

  return (
    <div className="min-h-screen bg-canvas">
      <Sidebar />
      <div className="min-h-screen lg:pl-[248px]">
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-line bg-white/95 px-4 backdrop-blur sm:px-7 lg:hidden">
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
          <div className="flex items-center gap-2">
            <Link
              to="/settings"
              aria-label="Open settings"
              title={profile?.display_name || user?.email || 'Settings'}
              className="grid size-9 place-items-center rounded-full border border-line bg-canvas text-xs font-semibold text-brand-dark"
            >
              {initials}
            </Link>
            <SignOutButton />
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1440px] px-4 pb-28 pt-6 sm:px-7 sm:pt-8 lg:px-10 lg:pb-10 lg:pt-10">
          <Outlet />
        </main>
      </div>
      <MobileNavigation />
      {user?.id && <OnboardingGuide userId={user.id} />}
    </div>
  )
}
