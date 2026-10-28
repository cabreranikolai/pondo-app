import { useState } from 'react'
import { Building2 } from 'lucide-react'
import { PHILIPPINE_BANK_DOMAINS } from '../../lib/bankDomains.js'

const LOGO_DEV_KEY = import.meta.env.VITE_LOGO_DEV_KEY

export default function BankLogo({ bankName, className = 'size-8' }) {
  const [failedDomain, setFailedDomain] = useState(null)
  const domain = PHILIPPINE_BANK_DOMAINS[bankName]

  if (!domain || !LOGO_DEV_KEY || failedDomain === domain) {
    return (
      <span
        aria-hidden="true"
        className={`grid ${className} shrink-0 place-items-center rounded-lg bg-brand-soft text-brand`}
      >
        <Building2 size={17} strokeWidth={1.8} />
      </span>
    )
  }

  return (
    <span
      aria-hidden="true"
      className={`grid ${className} shrink-0 place-items-center overflow-hidden rounded-lg border border-line bg-white p-1`}
    >
      <img
        src={`https://img.logo.dev/${encodeURIComponent(domain)}?token=${encodeURIComponent(LOGO_DEV_KEY)}`}
        alt=""
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={() => setFailedDomain(domain)}
        className="size-full object-contain"
      />
    </span>
  )
}
