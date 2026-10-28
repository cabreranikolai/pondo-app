import { NavLink } from 'react-router-dom'
import { primaryNavigation } from '../../constants/navigation.js'

export default function MobileNavigation() {
  return (
    <nav
      aria-label="Main navigation"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-center px-3 pt-2 pb-[calc(0.75rem+env(safe-area-inset-bottom))] lg:hidden"
    >
      <ul className="pointer-events-auto grid w-full max-w-[430px] grid-cols-5 gap-1 rounded-full border border-white/70 bg-white/85 p-1.5 shadow-[0_8px_30px_rgb(32_41_35_/_0.14)] backdrop-blur-xl backdrop-saturate-150 dark:border-white/10 dark:bg-[#202923]/85 dark:shadow-black/25">
        {primaryNavigation.map((item) => {
          const Icon = item.icon
          return (
            <li key={item.to} className="min-w-0">
              <NavLink
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `flex min-h-12 flex-col items-center justify-center gap-1 rounded-full px-1 text-[10px] font-medium leading-tight transition-[background-color,color,transform] duration-200 ease-out active:scale-[0.96] motion-reduce:transition-none ${
                    isActive
                      ? 'bg-brand-soft text-brand-dark dark:bg-white/10 dark:text-[#b9dfca]'
                      : 'text-muted dark:text-white/70'
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
