import { ArrowRightLeft } from 'lucide-react'
import EmptyState from '../components/ui/EmptyState.jsx'
import PageHeader from '../components/ui/PageHeader.jsx'

export default function Transactions() {
  return (
    <>
      <PageHeader
        eyebrow="Your activity"
        title="Transactions"
        description="Review income and expenses in one place."
      />
      <EmptyState
        icon={ArrowRightLeft}
        title="Transactions are not connected yet"
        description="This preview does not store or manage financial records. Transaction history will be available after backend integration."
      />
    </>
  )
}
