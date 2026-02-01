// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { render, screen, fireEvent, cleanup, act, waitFor } from '@testing-library/react'
import type { Message, UserMessage, AssistantMessage } from '@/lib/types'

afterEach(cleanup)

import { ChatHeader } from './chat-header'
import { ChatInput } from './chat-input'
import { MessageBubble } from './message-bubble'
import { MessageList } from './message-list'
import { ToolCallCard } from './tool-call-card'

// --- ChatHeader ---

describe('ChatHeader', () => {
  it('displays the title', () => {
    render(<ChatHeader title="My Chat" />)
    expect(screen.getByText('My Chat')).toBeInTheDocument()
  })

  it('displays "New Chat" when title is null', () => {
    render(<ChatHeader title={null} />)
    expect(screen.getByText('New Chat')).toBeInTheDocument()
  })
})

// --- ChatInput ---

describe('ChatInput', () => {
  it('calls onSend on form submit and clears input', () => {
    const onSend = vi.fn()
    render(<ChatInput onSend={onSend} isStreaming={false} />)

    const input = screen.getByPlaceholderText('Type a message…')
    fireEvent.change(input, { target: { value: 'Hello' } })
    fireEvent.submit(input.closest('form')!)

    expect(onSend).toHaveBeenCalledWith('Hello')
    expect(input).toHaveValue('')
  })

  it('is disabled when isStreaming is true', () => {
    const onSend = vi.fn()
    render(<ChatInput onSend={onSend} isStreaming={true} />)

    const input = screen.getByPlaceholderText('Type a message…')
    expect(input).toBeDisabled()
  })

  it('does not call onSend with empty input', () => {
    const onSend = vi.fn()
    render(<ChatInput onSend={onSend} isStreaming={false} />)

    fireEvent.submit(screen.getByPlaceholderText('Type a message…').closest('form')!)
    expect(onSend).not.toHaveBeenCalled()
  })
})

// --- MessageBubble ---

const userMessage: UserMessage = {
  id: '1',
  chatSessionId: 'session-1',
  role: 'user',
  senderId: 'user-1',
  status: 'completed',
  parts: [{ type: 'text', text: 'Hello **world**' }],
  createdAt: new Date(),
}

const assistantMessage: AssistantMessage = {
  id: '2',
  chatSessionId: 'session-1',
  role: 'assistant',
  workflowRunId: 'run-1',
  status: 'completed',
  parts: [
    { type: 'text', text: 'Let me search for that.' },
    { type: 'tool-call', toolCallId: 'tc-1', toolName: 'searchDrive', args: { query: 'report' } },
    { type: 'tool-result', toolCallId: 'tc-1', result: { files: ['report.pdf'] } },
  ],
  createdAt: new Date(),
}

describe('MessageBubble', () => {
  it('renders text parts as markdown content', () => {
    render(<MessageBubble message={userMessage} />)
    // The text "Hello" and bold "world" should be rendered
    expect(screen.getByText('Hello')).toBeInTheDocument()
    expect(screen.getByText('world')).toBeInTheDocument()
  })

  it('renders tool-call parts as ToolCallCard', () => {
    render(<MessageBubble message={assistantMessage} />)
    expect(screen.getByText('searchDrive')).toBeInTheDocument()
  })

  it('sets data-role attribute', () => {
    const { container } = render(<MessageBubble message={userMessage} />)
    expect(container.querySelector('[data-role="user"]')).toBeInTheDocument()
  })
})

// --- ToolCallCard ---

describe('ToolCallCard', () => {
  const toolCall = { type: 'tool-call' as const, toolCallId: 'tc-1', toolName: 'searchDrive', args: { query: 'report' } }
  const toolResult = { type: 'tool-result' as const, toolCallId: 'tc-1', result: { files: ['report.pdf'] } }

  it('shows tool name', () => {
    render(<ToolCallCard toolCall={toolCall} toolResult={toolResult} />)
    expect(screen.getByText('searchDrive')).toBeInTheDocument()
  })

  it('toggles input/output on expand', () => {
    render(<ToolCallCard toolCall={toolCall} toolResult={toolResult} />)

    // Content should be hidden initially
    expect(screen.queryByText('Input')).not.toBeInTheDocument()

    // Click to expand
    fireEvent.click(screen.getByText('searchDrive'))
    expect(screen.getByText('Input')).toBeInTheDocument()
    expect(screen.getByText('Output')).toBeInTheDocument()
  })

  it('shows spinner when no result yet', () => {
    const { container } = render(<ToolCallCard toolCall={toolCall} />)
    expect(container.querySelector('.animate-spin')).toBeInTheDocument()
  })
})

// --- MessageList ---

describe('MessageList', () => {
  beforeEach(() => {
    Element.prototype.scrollIntoView = vi.fn()
  })

  it('renders messages', () => {
    render(<MessageList messages={[userMessage, assistantMessage]} isStreaming={false} />)
    expect(screen.getByText('Hello')).toBeInTheDocument()
    expect(screen.getByText('searchDrive')).toBeInTheDocument()
  })

  it('auto-scrolls when new message is added', () => {
    const scrollIntoViewMock = vi.fn()
    Element.prototype.scrollIntoView = scrollIntoViewMock

    const { rerender } = render(
      <MessageList messages={[userMessage]} isStreaming={false} />
    )

    scrollIntoViewMock.mockClear()

    rerender(
      <MessageList
        messages={[userMessage, assistantMessage]}
        isStreaming={false}
      />
    )

    expect(scrollIntoViewMock).toHaveBeenCalled()
  })
})
