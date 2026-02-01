"use client"

import type { MessagePart } from "@/lib/types"
import { cn } from "@/lib/utils"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { ChevronRight, Loader2 } from "lucide-react"

type ToolCallPart = Extract<MessagePart, { type: "tool-call" }>
type ToolResultPart = Extract<MessagePart, { type: "tool-result" }>

interface ToolCallCardProps {
  toolCall: ToolCallPart
  toolResult?: ToolResultPart
  className?: string
}

export function ToolCallCard({
  toolCall,
  toolResult,
  className,
}: ToolCallCardProps) {
  const hasResult = !!toolResult

  return (
    <Collapsible
      className={cn(
        "rounded-lg border bg-muted/50 text-sm",
        className
      )}
    >
      <CollapsibleTrigger className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-muted/80 [&[data-state=open]>svg.chevron]:rotate-90">
        {hasResult ? (
          <ChevronRight className="chevron size-4 shrink-0 transition-transform" />
        ) : (
          <Loader2 className="size-4 shrink-0 animate-spin" />
        )}
        <span className="font-medium">{toolCall.toolName}</span>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="border-t px-3 py-2 space-y-2">
          <div>
            <div className="text-xs font-medium text-muted-foreground mb-1">
              Input
            </div>
            <pre className="text-xs overflow-x-auto whitespace-pre-wrap break-all">
              {JSON.stringify(toolCall.args, null, 2)}
            </pre>
          </div>
          {toolResult && (
            <div>
              <div className="text-xs font-medium text-muted-foreground mb-1">
                Output
              </div>
              <pre className="text-xs overflow-x-auto whitespace-pre-wrap break-all">
                {JSON.stringify(toolResult.result, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
