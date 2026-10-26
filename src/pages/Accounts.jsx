import { WalletCards } from 'lucide-react'
import EmptyState from '../components/ui/EmptyState.jsx'
import PageHeader from '../components/ui/PageHeader.jsx'

export default function Accounts() {
  return (
    <>
      <PageHeader
        eyebrow="Your money"
        title="Accounts"
        description="See the accounts you use to keep track of your money."
      />
      <EmptyState
        icon={WalletCards}
        title="Your accounts will appear here"
        description="There are no connected accounts in this preview. Account setup will be available in a future phase."
      />
    </>
  )
}
