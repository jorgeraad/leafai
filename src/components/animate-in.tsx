"use client"

import { cn } from "@/lib/utils"

interface AnimateInProps {
  children: React.ReactNode
  variant?: "fade" | "fade-up"
  delay?: number
  duration?: number
  className?: string
  as?: keyof React.JSX.IntrinsicElements
}

export function AnimateIn({
  children,
  variant = "fade-up",
  delay = 0,
  duration,
  className,
  as: Tag = "div",
}: AnimateInProps) {
  return (
    <Tag
      className={cn(
        variant === "fade-up" ? "animate-fade-in-up" : "animate-fade-in",
        className,
      )}
      style={{
        animationDelay: delay ? `${delay}ms` : undefined,
        animationDuration: duration ? `${duration}ms` : undefined,
      }}
    >
      {children}
    </Tag>
  )
}
