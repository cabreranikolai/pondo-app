import { Tags } from 'lucide-react'
import EmptyState from '../components/ui/EmptyState.jsx'
import PageHeader from '../components/ui/PageHeader.jsx'

export default function Budgets() {
  return (
    <>
      <PageHeader
        eyebrow="Plan ahead"
        title="Budgets"
        description="Set monthly spending plans and keep an eye on category progress."
      />
      <EmptyState
        icon={Tags}
        title="Your budget plans will appear here"
        description="Budget management is not available in this preview. The dashboard shows illustrative sample budgets only."
      />
    </>
  )
}
