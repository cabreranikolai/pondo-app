export default function SummaryCard({
  label,
  amount,
  icon: Icon,
  detail,
  tone = 'default',
}) {
  const toneClasses = {
    default: 'bg-canvas text-ink',
    positive: 'bg-brand-soft text-brand-dark',
    negative: 'bg-danger-soft text-danger',
  }

  return (
    <article className="rounded-xl border border-line bg-white p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium text-muted sm:text-sm">{label}</p>
        <span className={`grid size-9 shrink-0 place-items-center rounded-lg ${toneClasses[tone]}`}>
          <Icon aria-hidden="true" size={18} strokeWidth={1.8} />
        </span>
      </div>
      <p className="mt-4 text-[1.35rem] font-semibold tracking-tight text-ink sm:text-2xl">
        {amount}
      </p>
      <p className="mt-1 text-xs text-muted">{detail}</p>
    </article>
  )
}
