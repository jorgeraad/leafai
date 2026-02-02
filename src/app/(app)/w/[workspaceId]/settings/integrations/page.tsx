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
      <div className="flex gap-3 rounded-2xl border border-yellow-300 bg-yellow-50 px-4 py-3 text-sm text-yellow-900 dark:border-yellow-700 dark:bg-yellow-950/40 dark:text-yellow-200">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="mt-0.5 h-5 w-5 shrink-0 text-yellow-600 dark:text-yellow-400"
        >
          <path
            fillRule="evenodd"
            d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 6a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 6zm0 9a1 1 0 100-2 1 1 0 000 2z"
            clipRule="evenodd"
          />
        </svg>
        <p>
          <strong>Google verification pending:</strong> When connecting Google Drive, you may see a &ldquo;Google hasn&apos;t verified this app&rdquo; warning. This is normal while the app is under review. To proceed, click <strong>Advanced</strong>, then <strong>&ldquo;Go to Leaf (unsafe)&rdquo;</strong>. Otherwise, you can continue using Leaf without Google Drive until verification is complete.
        </p>
      </div>
      <IntegrationSettingsClient
        workspaceId={workspaceId}
        initialStatus={status}
        initialEmail={email}
      />
    </div>
  )
}
