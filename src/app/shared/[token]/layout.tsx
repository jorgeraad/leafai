import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Shared Chat — Leaf AI",
}

export default function SharedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-dvh flex-col">
      {children}
    </div>
  )
}
