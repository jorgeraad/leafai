import { redirect } from 'next/navigation'

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>
}) {
  const { workspaceId } = await params
  redirect(`/w/${workspaceId}/settings/integrations`)
}
