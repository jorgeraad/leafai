'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export type IntegrationCardStatus = 'not_connected' | 'active' | 'error'

interface IntegrationCardProps {
  provider: string
  status: IntegrationCardStatus
  email?: string | null
  onConnect: () => void
  onDisconnect: () => void
}

const statusLabels: Record<IntegrationCardStatus, string> = {
  not_connected: 'Not connected',
  active: 'Connected',
  error: 'Error',
}

const badgeVariants: Record<IntegrationCardStatus, 'secondary' | 'default' | 'destructive'> = {
  not_connected: 'secondary',
  active: 'default',
  error: 'destructive',
}

export function IntegrationCard({ provider, status, email, onConnect, onDisconnect }: IntegrationCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CardTitle>Google Drive</CardTitle>
            <Badge variant={badgeVariants[status]}>{statusLabels[status]}</Badge>
          </div>
        </div>
        <CardDescription>
          {status === 'not_connected' && 'Connect your Google Drive to use folder contents as context in conversations.'}
          {status === 'active' && email && `Connected as ${email}`}
          {status === 'active' && !email && 'Connected to Google Drive'}
          {status === 'error' && 'Your Google Drive connection has an error. Reconnect to restore access.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {status === 'not_connected' && (
          <Button onClick={onConnect}>Connect</Button>
        )}
        {status === 'active' && (
          <Button variant="destructive" onClick={onDisconnect}>Disconnect</Button>
        )}
        {status === 'error' && (
          <Button onClick={onConnect}>Reconnect</Button>
        )}
      </CardContent>
    </Card>
  )
}
