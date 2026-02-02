"use client"

import { useMemo, useState, useRef, useEffect, type ReactNode, Children, isValidElement, cloneElement, type ReactElement } from "react"
import { createPortal } from "react-dom"
import Markdown from "react-markdown"
import remarkGfm from "remark-gfm"
import type { Message, MessagePart } from "@/lib/types"
import { cn } from "@/lib/utils"
import { ToolCallCard } from "./tool-call-card"

interface MessageBubbleProps {
  message: Message
  className?: string
}

interface Citation {
  number: number
  title: string
  url: string
}

// Matches a complete sources block: <!-- sources\n...\n-->
const SOURCES_COMPLETE_RE = /<!-- sources\n([\s\S]*?)-->/
// Matches a sources block that's still streaming (no closing -->)
const SOURCES_PARTIAL_RE = /<!-- sources\n([\s\S]*)$/
const SOURCE_LINE_RE = /^\[(\d+)]\s+(.+?)\s*\|\s*(\S+)$/
const CITE_INLINE_RE = /\[(\d+)]/g

function parseCitations(text: string): { body: string; citations: Citation[] } {
  const completeMatch = text.match(SOURCES_COMPLETE_RE)
  const match = completeMatch || text.match(SOURCES_PARTIAL_RE)
  if (!match) return { body: text, citations: [] }

  const body = text.slice(0, match.index).trimEnd()
  const citations: Citation[] = []

  for (const line of match[1].split("\n")) {
    const m = line.trim().match(SOURCE_LINE_RE)
    if (m) {
      citations.push({ number: parseInt(m[1], 10), title: m[2], url: m[3] })
    }
  }

  return { body, citations }
}

function CitationPill({ number, citation }: { number: number; citation?: Citation }) {
  const [hovered, setHovered] = useState(false)
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null)
  const ref = useRef<HTMLAnchorElement>(null)

  useEffect(() => {
    if (hovered && ref.current) {
      const rect = ref.current.getBoundingClientRect()
      setCoords({
        top: rect.top - 4,
        left: rect.left + rect.width / 2,
      })
    }
  }, [hovered])

  return (
    <span className="inline align-super">
      <a
        ref={ref}
        href={citation?.url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-primary/15 text-[10px] font-medium text-primary hover:bg-primary/25 transition-colors no-underline cursor-pointer"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {number}
      </a>
      {hovered && citation && coords && createPortal(
        <span
          className="fixed -translate-x-1/2 -translate-y-full px-2.5 py-1.5 rounded-lg bg-popover text-popover-foreground text-xs shadow-md border whitespace-nowrap z-[9999] pointer-events-none"
          style={{ top: coords.top, left: coords.left }}
        >
          {citation.title}
        </span>,
        document.body
      )}
    </span>
  )
}

function SourceCard({ citation }: { citation: Citation }) {
  return (
    <a
      href={citation.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-1.5 rounded-md border bg-card px-2 py-1 text-xs hover:bg-accent transition-colors no-underline"
    >
      <span className="flex items-center justify-center h-4 w-4 shrink-0 rounded-full bg-primary/15 text-[9px] font-semibold text-primary">
        {citation.number}
      </span>
      <span className="truncate text-card-foreground">{citation.title}</span>
    </a>
  )
}

/**
 * Recursively walk React children, find string nodes containing [n] markers,
 * and replace them with a mix of text and CitationPill components.
 */
function injectCitationPills(children: ReactNode, citationMap: Map<number, Citation>): ReactNode {
  return Children.map(children, (child) => {
    if (typeof child === "string") {
      // Check if this string contains any [n] patterns
      if (!CITE_INLINE_RE.test(child)) return child
      CITE_INLINE_RE.lastIndex = 0 // reset after test()

      const parts: ReactNode[] = []
      let last = 0
      let m: RegExpExecArray | null

      while ((m = CITE_INLINE_RE.exec(child)) !== null) {
        if (m.index > last) {
          parts.push(child.slice(last, m.index))
        }
        const num = parseInt(m[1], 10)
        parts.push(
          <CitationPill key={`cite-${m.index}`} number={num} citation={citationMap.get(num)} />
        )
        last = CITE_INLINE_RE.lastIndex
      }

      if (last < child.length) {
        parts.push(child.slice(last))
      }

      return <>{parts}</>
    }

    if (isValidElement(child)) {
      const el = child as ReactElement<{ children?: ReactNode }>
      if (el.props.children) {
        return cloneElement(el, {}, injectCitationPills(el.props.children, citationMap))
      }
    }

    return child
  })
}

function ThinkingAnimation() {
  return (
    <div className="flex animate-fade-in-up justify-start px-4">
      <span className="inline-block relative text-base text-muted-foreground/70 select-none">
        <span className="relative overflow-hidden inline-block">
          <span>Thinking...</span>
          <span className="absolute inset-0 animate-[text-sheen_1.5s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-foreground/90 to-transparent bg-[length:50%_100%] bg-no-repeat [-webkit-background-clip:text] [background-clip:text]">
            Thinking...
          </span>
        </span>
      </span>
    </div>
  )
}

const markdownComponents = {
  a: ({ href, children }: { href?: string; children?: ReactNode }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-blue-500 underline decoration-blue-500/40 underline-offset-2 hover:decoration-blue-500 transition-colors"
    >
      {children}
    </a>
  ),
}

function MarkdownWithCitations({
  text,
  citations,
  isUser,
}: {
  text: string
  citations: Citation[]
  isUser: boolean
}) {
  const citationMap = useMemo(() => {
    const map = new Map<number, Citation>()
    for (const c of citations) map.set(c.number, c)
    return map
  }, [citations])

  // Inject pills whenever the text contains [n] markers, even before sources arrive
  const hasInlineMarkers = CITE_INLINE_RE.test(text)
  CITE_INLINE_RE.lastIndex = 0

  return (
    <div className={cn("prose prose-sm max-w-none overflow-x-auto break-words prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5 prose-headings:my-3 prose-pre:my-2 prose-p:leading-relaxed", isUser ? "prose-invert" : "dark:prose-invert")}>
      <Markdown
        remarkPlugins={[remarkGfm]}
        components={hasInlineMarkers ? {
          ...markdownComponents,
          p: ({ children }) => <p className="my-2 leading-relaxed">{injectCitationPills(children, citationMap)}</p>,
          li: ({ children, ...props }) => <li {...props}>{injectCitationPills(children, citationMap)}</li>,
          h1: ({ children, ...props }) => <h1 {...props}>{injectCitationPills(children, citationMap)}</h1>,
          h2: ({ children, ...props }) => <h2 {...props}>{injectCitationPills(children, citationMap)}</h2>,
          h3: ({ children, ...props }) => <h3 {...props}>{injectCitationPills(children, citationMap)}</h3>,
          h4: ({ children, ...props }) => <h4 {...props}>{injectCitationPills(children, citationMap)}</h4>,
          td: ({ children, ...props }) => <td {...props}>{injectCitationPills(children, citationMap)}</td>,
          th: ({ children, ...props }) => <th {...props}>{injectCitationPills(children, citationMap)}</th>,
        } : markdownComponents}
      >{text}</Markdown>
    </div>
  )
}

export function MessageBubble({ message, className }: MessageBubbleProps) {
  const isUser = message.role === "user"
  const isThinking =
    message.role === "assistant" &&
    message.status === "streaming" &&
    message.parts.filter((p) => p.type !== "tool-result").length === 0

  if (isThinking) {
    return <ThinkingAnimation />
  }

  // Build a map of tool results keyed by toolCallId for quick lookup
  const toolResults = new Map<string, Extract<MessagePart, { type: "tool-result" }>>()
  for (const part of message.parts) {
    if (part.type === "tool-result") {
      toolResults.set(part.toolCallId, part)
    }
  }

  return (
    <div
      data-slot="message-bubble"
      data-role={message.role}
      className={cn(
        "flex animate-fade-in-up",
        isUser ? "justify-end" : "justify-start",
        className
      )}
    >
      <div
        className={cn(
          "max-w-[90%] md:max-w-[80%] rounded-2xl px-3 py-2 md:px-4",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-foreground"
        )}
      >
        {message.parts.map((part, i) => {
          if (part.type === "text") {
            const { body, citations } = parseCitations(part.text)
            return (
              <div key={i}>
                <MarkdownWithCitations
                  text={body}
                  citations={citations}
                  isUser={isUser}
                />
                {citations.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5 border-t pt-1.5 border-border/50">
                    {citations.map((c) => (
                      <SourceCard key={c.number} citation={c} />
                    ))}
                  </div>
                )}
              </div>
            )
          }
          if (part.type === "tool-call") {
            return (
              <ToolCallCard
                key={part.toolCallId}
                toolCall={part}
                toolResult={toolResults.get(part.toolCallId)}
                className="my-2"
              />
            )
          }
          // tool-result parts are rendered inline with their tool-call
          return null
        })}
      </div>
    </div>
  )
}
