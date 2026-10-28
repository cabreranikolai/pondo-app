export default function SummaryCard({
  label,
  amount,
  icon: Icon,
  detail,
  tone = 'default',
  compact = false,
}) {
  const toneClasses = {
    default: 'bg-canvas text-ink',
    positive: 'bg-brand-soft text-brand-dark',
    negative: 'bg-danger-soft text-danger',
  }

  if (compact) {
    return (
      <article className="flex min-w-0 items-center justify-between gap-3 rounded-xl border border-line bg-white p-3 sm:p-4">
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted sm:text-sm">{label}</p>
          <p className="mt-1 break-words text-lg font-semibold tracking-tight text-ink sm:text-xl">
            {amount}
          </p>
          <p className="mt-0.5 break-words text-xs leading-5 text-muted">{detail}</p>
        </div>
        <span className={`grid size-9 shrink-0 place-items-center rounded-lg ${toneClasses[tone]}`}>
          <Icon aria-hidden="true" size={18} strokeWidth={1.8} />
        </span>
      </article>
    )
  }

  return (
    <article className="rounded-xl border border-line bg-white p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium text-muted sm:text-sm">{label}</p>
        <span className={`grid size-9 shrink-0 place-items-center rounded-lg ${toneClasses[tone]}`}>
          <Icon aria-hidden="true" size={18} strokeWidth={1.8} />
        </span>
      </div>
      <p className="mt-4 break-words text-[clamp(1.05rem,5vw,1.5rem)] font-semibold tracking-tight text-ink sm:text-2xl">
        {amount}
      </p>
      <p className="mt-1 break-words text-xs leading-5 text-muted">{detail}</p>
    </article>
  )
}
