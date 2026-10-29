import { useState } from 'react'
import { Building2, Smartphone } from 'lucide-react'
import { PHILIPPINE_BANK_DOMAINS } from '../../lib/bankDomains.js'
import { PHILIPPINE_E_WALLET_DOMAINS } from '../../lib/philippineEWallets.js'

const LOGO_DEV_KEY = import.meta.env.VITE_LOGO_DEV_KEY

export default function FinancialProviderLogo({
  providerName,
  providerType,
  className = 'size-8',
}) {
  const [failedDomain, setFailedDomain] = useState(null)
  const domainMap = providerType === 'E_WALLET'
    ? PHILIPPINE_E_WALLET_DOMAINS
    : PHILIPPINE_BANK_DOMAINS
  const domain = domainMap[providerName]
  const FallbackIcon = providerType === 'E_WALLET' ? Smartphone : Building2

  if (!domain || !LOGO_DEV_KEY || failedDomain === domain) {
    return (
      <span
        aria-hidden="true"
        className={`grid ${className} shrink-0 place-items-center rounded-lg bg-brand-soft text-brand`}
      >
        <FallbackIcon size={17} strokeWidth={1.8} />
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
