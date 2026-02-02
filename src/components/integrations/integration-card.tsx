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
            <svg className="size-5 shrink-0" viewBox="0 0 87.3 78" xmlns="http://www.w3.org/2000/svg">
              <path d="M6.6 66.85l3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8H1.2c0 1.55.4 3.1 1.2 4.5l4.2 9.35z" fill="#0066da"/>
              <path d="M43.65 25.15L29.9 1.35c-1.35.8-2.5 1.9-3.3 3.3L1.2 52.65c-.8 1.4-1.2 2.95-1.2 4.5h27.45l16.2-32z" fill="#00ac47"/>
              <path d="M73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75L86.1 57.1c.8-1.4 1.2-2.95 1.2-4.45H59.85L53 66.85l-5.5 9.95 13.75.05c1.35-.05 2.5-.15 3.3-.95l9-9.1z" fill="#ea4335"/>
              <path d="M43.65 25.15L57.4 1.35C56.05.55 54.5 0 52.85 0H34.45c-1.65 0-3.2.55-4.55 1.35l13.75 23.8z" fill="#00832d"/>
              <path d="M59.85 52.65h-32.4L13.7 76.45c1.35.8 2.9 1.35 4.55 1.35h36.75c1.65 0 3.2-.55 4.55-1.35L59.85 52.65z" fill="#2684fc"/>
              <path d="M73.4 26.5l-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3L43.65 25.15l16.2 27.5h27.45c0-1.55-.4-3.1-1.2-4.5L73.4 26.5z" fill="#ffba00"/>
            </svg>
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
