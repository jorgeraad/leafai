import { createClient } from '@/lib/supabase/server'
import { getIntegration } from '@/lib/db'
import { redirect } from 'next/navigation'
import { IntegrationSettingsClient } from './client'

export default async function IntegrationsSettingsPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>
}) {
  const { workspaceId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const integration = await getIntegration(user.id, workspaceId, 'google_drive')

  const status = integration ? integration.status === 'active' ? 'active' as const : 'error' as const : 'not_connected' as const
  const email = integration?.providerAccountEmail ?? undefined

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6 animate-fade-in-up">
      <h1 className="text-2xl font-bold">Integrations</h1>
      <IntegrationSettingsClient
        workspaceId={workspaceId}
        initialStatus={status}
        initialEmail={email}
      />
    </div>
  )
}
