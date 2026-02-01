'use client'

import { useRouter } from 'next/navigation'
import { IntegrationCard, type IntegrationCardStatus } from '@/components/integrations'

interface IntegrationSettingsClientProps {
  workspaceId: string
  initialStatus: IntegrationCardStatus
  initialEmail?: string
}

export function IntegrationSettingsClient({
  workspaceId,
  initialStatus,
  initialEmail,
}: IntegrationSettingsClientProps) {
  const router = useRouter()

  function handleConnect() {
    window.location.href = `/auth/integrations/google-drive?workspaceId=${workspaceId}`
  }

  async function handleDisconnect() {
    const res = await fetch(`/api/integrations/google_drive?workspaceId=${workspaceId}`, {
      method: 'DELETE',
    })
    if (res.ok) {
      router.refresh()
    }
  }

  return (
    <IntegrationCard
      provider="google_drive"
      status={initialStatus}
      email={initialEmail}
      onConnect={handleConnect}
      onDisconnect={handleDisconnect}
    />
  )
}
