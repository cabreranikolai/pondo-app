import { NavLink } from 'react-router-dom'
import { primaryNavigation } from '../../constants/navigation.js'

export default function MobileNavigation() {
  return (
    <nav
      aria-label="Main navigation"
      className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/95 px-2 pt-2 backdrop-blur lg:hidden"
    >
      <ul className="mx-auto flex max-w-lg items-stretch justify-around">
        {primaryNavigation.map((item) => {
          const Icon = item.icon
          return (
            <li key={item.to} className="flex-1">
              <NavLink
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `flex min-h-12 flex-col items-center justify-center gap-1 rounded-lg text-[10px] font-medium ${
                    isActive ? 'text-brand-dark' : 'text-muted'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      aria-hidden="true"
                      size={19}
                      strokeWidth={isActive ? 2.2 : 1.8}
                    />
                    <span>{item.label === 'Overview' ? 'Home' : item.label}</span>
                  </>
                )}
              </NavLink>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
