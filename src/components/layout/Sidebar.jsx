import { CircleHelp } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { primaryNavigation, secondaryNavigation } from '../../constants/navigation.js'
import BrandMark from '../ui/BrandMark.jsx'

function NavigationLink({ item }) {
  const Icon = item.icon
  return (
    <NavLink
      to={item.to}
      end={item.to === '/'}
      className={({ isActive }) =>
        `flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors ${
          isActive
            ? 'bg-brand-soft text-brand-dark'
            : 'text-muted hover:bg-canvas hover:text-ink'
        }`
      }
    >
      <Icon aria-hidden="true" size={18} strokeWidth={1.8} />
      {item.label}
    </NavLink>
  )
}

export default function Sidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-20 hidden w-[248px] flex-col border-r border-line bg-white px-5 pb-5 pt-7 lg:flex">
      <NavLink to="/" className="mb-10 flex items-center gap-3 px-2">
        <BrandMark />
        <span>
          <span className="block text-base font-semibold tracking-tight text-ink">
            Pondo
          </span>
          <span className="mt-0.5 block text-xs text-muted">
            Your Money, in Balance.
          </span>
        </span>
      </NavLink>

      <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
        Workspace
      </p>
      <nav aria-label="Main navigation" className="space-y-1">
        {primaryNavigation.map((item) => (
          <NavigationLink key={item.to} item={item} />
        ))}
      </nav>

      <div className="mt-auto">
        <nav aria-label="Account navigation" className="mb-5">
          {secondaryNavigation.map((item) => (
            <NavigationLink key={item.to} item={item} />
          ))}
        </nav>
        <div className="rounded-xl border border-line bg-canvas p-4">
          <CircleHelp aria-hidden="true" className="mb-3 text-brand" size={19} />
          <p className="text-sm font-medium text-ink">A clearer money picture</p>
          <p className="mt-1 text-xs leading-5 text-muted">
            Keep your monthly spending and plans in one place.
          </p>
        </div>
        <p className="mt-5 px-2 text-[11px] text-muted">Your Money, in Balance.</p>
      </div>
    </aside>
  )
}
