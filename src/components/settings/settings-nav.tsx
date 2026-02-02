'use client'

import Link from 'next/link'
import { useSelectedLayoutSegment } from 'next/navigation'
import { Plug, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'
import { signOut } from '@/app/auth/actions'

const navItems = [
  { label: 'Integrations', href: 'integrations', segment: 'integrations', icon: Plug },
]

interface SettingsNavProps {
  workspaceId: string
}

export function SettingsNav({ workspaceId }: SettingsNavProps) {
  const segment = useSelectedLayoutSegment()

  return (
    <nav className="flex gap-1 md:h-full md:flex-col">
      {navItems.map((item) => (
        <Link
          key={item.segment}
          href={`/w/${workspaceId}/settings/${item.href}`}
          className={cn(
            'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
            segment === item.segment
              ? 'bg-accent text-accent-foreground'
              : 'text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground'
          )}
        >
          <item.icon className="size-4" />
          {item.label}
        </Link>
      ))}
      <form action={signOut} className="md:mt-auto">
        <button
          type="submit"
          className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-medium text-muted-foreground transition-colors hover:bg-accent/50 hover:text-accent-foreground"
        >
          <LogOut className="size-4" />
          Sign out
        </button>
      </form>
    </nav>
  )
}
