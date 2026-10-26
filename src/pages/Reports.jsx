import { ChartNoAxesCombined } from 'lucide-react'
import EmptyState from '../components/ui/EmptyState.jsx'
import PageHeader from '../components/ui/PageHeader.jsx'

export default function Reports() {
  return (
    <>
      <PageHeader
        eyebrow="Understand your money"
        title="Reports"
        description="Explore your income, expenses, and spending trends over time."
      />
      <EmptyState
        icon={ChartNoAxesCombined}
        title="Reports will be available soon"
        description="Financial reports will be based on your records once backend integration is in place."
      />
    </>
  )
}
