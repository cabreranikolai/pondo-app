import { Settings2 } from 'lucide-react'
import EmptyState from '../components/ui/EmptyState.jsx'
import PageHeader from '../components/ui/PageHeader.jsx'

export default function Settings() {
  return (
    <>
      <PageHeader
        eyebrow="Preferences"
        title="Settings"
        description="Manage your profile and application preferences."
      />
      <EmptyState
        icon={Settings2}
        title="Settings are not available yet"
        description="Profile and preference controls will be introduced in a future phase."
      />
    </>
  )
}
