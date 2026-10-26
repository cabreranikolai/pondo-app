import { Inbox } from 'lucide-react'

export default function EmptyState({ icon: Icon = Inbox, title, description }) {
  return (
    <div className="flex min-h-56 flex-col items-center justify-center rounded-xl border border-dashed border-line bg-white px-6 py-10 text-center">
      <div className="mb-4 grid size-11 place-items-center rounded-xl bg-brand-soft text-brand">
        <Icon aria-hidden="true" size={21} strokeWidth={1.8} />
      </div>
      <h2 className="text-sm font-semibold text-ink">{title}</h2>
      <p className="mt-2 max-w-sm text-sm leading-6 text-muted">{description}</p>
    </div>
  )
}
