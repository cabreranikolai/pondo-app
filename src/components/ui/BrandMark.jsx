import { Wallet } from 'lucide-react'

export default function BrandMark({ compact = false }) {
  return (
    <span
      aria-hidden="true"
      className={`relative grid shrink-0 place-items-center rounded-xl bg-brand text-white ${
        compact ? 'size-8 rounded-lg' : 'size-10'
      }`}
    >
      <Wallet
        size={compact ? 17 : 21}
        strokeWidth={1.8}
      />
      <span
        className={`absolute rounded-full border-2 border-brand bg-brand-soft ${
          compact ? 'bottom-1 right-1 size-2.5' : 'bottom-1 right-1 size-3'
        }`}
      />
    </span>
  )
}
