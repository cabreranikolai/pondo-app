import { CircleHelp } from 'lucide-react'
import { Link } from 'react-router-dom'
import PageHeader from '../components/ui/PageHeader.jsx'

export default function NotFound() {
  return (
    <>
      <PageHeader eyebrow="Page not found" title="That page isn’t here" />
      <div className="rounded-xl border border-line bg-white p-6 sm:p-8">
        <div className="mb-4 grid size-11 place-items-center rounded-xl bg-brand-soft text-brand">
          <CircleHelp aria-hidden="true" size={21} />
        </div>
        <p className="max-w-lg text-sm leading-6 text-muted">
          The link may be outdated, or the page may have moved. Your finances are safe;
          this page is simply unavailable.
        </p>
        <Link
          to="/"
          className="mt-5 inline-flex min-h-11 items-center rounded-lg bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-dark"
        >
          Back to overview
        </Link>
      </div>
    </>
  )
}
