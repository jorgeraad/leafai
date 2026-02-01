'use client'

import Link from 'next/link'
import { useSelectedLayoutSegment } from 'next/navigation'
import { cn } from '@/lib/utils'

const navItems = [
  { label: 'Integrations', href: 'integrations', segment: 'integrations' },
]

interface SettingsNavProps {
  workspaceId: string
}

export function SettingsNav({ workspaceId }: SettingsNavProps) {
  const segment = useSelectedLayoutSegment()

  return (
    <nav className="flex flex-col gap-1">
      {navItems.map((item) => (
        <Link
          key={item.segment}
          href={`/w/${workspaceId}/settings/${item.href}`}
          className={cn(
            'rounded-md px-3 py-2 text-sm font-medium transition-colors',
            segment === item.segment
              ? 'bg-accent text-accent-foreground'
              : 'text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground'
          )}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  )
}
