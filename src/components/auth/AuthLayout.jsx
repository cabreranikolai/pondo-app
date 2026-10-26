import { Link } from 'react-router-dom'
import BrandMark from '../ui/BrandMark.jsx'

export default function AuthLayout({ eyebrow, title, description, children }) {
  return (
    <main className="grid min-h-screen bg-canvas px-4 py-8 sm:place-items-center sm:py-12">
      <div className="mx-auto w-full max-w-md">
        <Link to="/login" className="mb-8 flex items-center justify-center gap-3 sm:mb-10">
          <BrandMark />
          <span className="text-left">
            <span className="block text-base font-semibold tracking-tight text-ink">Pondo</span>
            <span className="mt-0.5 block text-xs text-muted">Your Money, in Balance.</span>
          </span>
        </Link>
        <section className="rounded-2xl border border-line bg-white p-5 shadow-sm sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand">{eyebrow}</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink">{title}</h1>
          <p className="mt-2 text-sm leading-6 text-muted">{description}</p>
          <div className="mt-6">{children}</div>
        </section>
        <p className="mt-6 text-center text-xs text-muted">
          Your Money, in Balance.
        </p>
      </div>
    </main>
  )
}
