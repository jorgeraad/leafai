import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { SettingsNav } from '@/components/settings/settings-nav'

export default async function SettingsLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ workspaceId: string }>
}) {
  const { workspaceId } = await params

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-3 border-b px-6 py-4">
        <Link
          href={`/w/${workspaceId}`}
          className="text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Back to workspace"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <h1 className="text-lg font-semibold">Settings</h1>
      </header>
      <div className="flex flex-1 overflow-hidden">
        <aside className="w-48 border-r p-4">
          <SettingsNav workspaceId={workspaceId} />
        </aside>
        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  )
}
