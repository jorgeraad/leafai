import { describe, it, expect, vi, afterEach, beforeEach } from "vitest"
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react"
import type { ChatSession } from "@/lib/types"

afterEach(cleanup)

// --- Mocks ---

const mockPush = vi.fn()

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}))

const mockFrom = vi.fn()
const mockClient = { from: mockFrom }

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => mockClient,
}))

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode
    href: string
    className?: string
    "aria-current"?: string
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

// --- Test data ---

const now = new Date("2026-02-01T12:00:00Z")
const earlier = new Date("2026-02-01T11:00:00Z")

const mockSessions: ChatSession[] = [
  {
    id: "s1",
    workspaceId: "w1",
    title: "First Chat",
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "s2",
    workspaceId: "w1",
    title: null,
    createdAt: earlier,
    updatedAt: earlier,
  },
]

const mockDbRows = [
  {
    id: "s1",
    workspace_id: "w1",
    title: "First Chat",
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
  },
  {
    id: "s2",
    workspace_id: "w1",
    title: null,
    created_at: earlier.toISOString(),
    updated_at: earlier.toISOString(),
  },
]

// --- Imports (after mocks) ---

import { SessionList } from "./session-list"
import { Sidebar } from "./sidebar"
import { useChatSessions } from "@/hooks/use-chat-sessions"
import { renderHook, act } from "@testing-library/react"

// --- SessionList tests ---

describe("SessionList", () => {
  it("renders session titles", () => {
    render(
      <SessionList
        sessions={mockSessions}
        activeChatId={null}
        workspaceId="w1"
      />
    )
    expect(screen.getByText("First Chat")).toBeInTheDocument()
    expect(screen.getByText("New Chat")).toBeInTheDocument()
  })

  it("highlights the active session", () => {
    render(
      <SessionList
        sessions={mockSessions}
        activeChatId="s1"
        workspaceId="w1"
      />
    )
    const activeLink = screen.getByText("First Chat")
    expect(activeLink).toHaveAttribute("aria-current", "page")

    const inactiveLink = screen.getByText("New Chat")
    expect(inactiveLink).not.toHaveAttribute("aria-current")
  })

  it("shows empty state when no sessions", () => {
    render(
      <SessionList sessions={[]} activeChatId={null} workspaceId="w1" />
    )
    expect(screen.getByText("No chats yet")).toBeInTheDocument()
  })
})

// --- Sidebar tests ---

describe("Sidebar", () => {
  it('renders "New Chat" button that calls onNewChat', () => {
    const onNewChat = vi.fn()
    render(
      <Sidebar
        sessions={mockSessions}
        activeChatId={null}
        workspaceId="w1"
        isLoading={false}
        onNewChat={onNewChat}
      />
    )
    const btn = screen.getByRole("button", { name: /new chat/i })
    fireEvent.click(btn)
    expect(onNewChat).toHaveBeenCalledOnce()
  })

  it("is collapsible — toggle hides session list", () => {
    render(
      <Sidebar
        sessions={mockSessions}
        activeChatId={null}
        workspaceId="w1"
        isLoading={false}
        onNewChat={vi.fn()}
      />
    )

    // Sessions visible initially
    expect(screen.getByText("First Chat")).toBeInTheDocument()

    // Collapse
    fireEvent.click(screen.getByLabelText("Collapse sidebar"))
    expect(screen.queryByText("First Chat")).not.toBeInTheDocument()

    // Expand
    fireEvent.click(screen.getByLabelText("Expand sidebar"))
    expect(screen.getByText("First Chat")).toBeInTheDocument()
  })

  it("shows skeletons when loading", () => {
    const { container } = render(
      <Sidebar
        sessions={[]}
        activeChatId={null}
        workspaceId="w1"
        isLoading={true}
        onNewChat={vi.fn()}
      />
    )
    const skeletons = container.querySelectorAll('[data-slot="skeleton"]')
    expect(skeletons.length).toBeGreaterThan(0)
  })
})

// --- useChatSessions tests ---

describe("useChatSessions", () => {
  beforeEach(() => {
    mockFrom.mockReset()
    mockPush.mockReset()
  })

  it("fetches sessions on mount and returns sorted list", async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: mockDbRows, error: null }),
        }),
      }),
    })

    const { result } = renderHook(() => useChatSessions("w1"))

    expect(result.current.isLoading).toBe(true)

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.sessions).toHaveLength(2)
    expect(result.current.sessions[0].id).toBe("s1")
    expect(result.current.sessions[1].id).toBe("s2")
  })

  it("createSession inserts, prepends to list, and navigates", async () => {
    // Initial fetch
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      }),
    })

    const { result } = renderHook(() => useChatSessions("w1"))
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    // Setup for createSession call
    const newRow = {
      id: "s-new",
      workspace_id: "w1",
      title: null,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    }
    mockFrom.mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: newRow, error: null }),
        }),
      }),
    })

    let created: ChatSession | undefined
    await act(async () => {
      created = await result.current.createSession()
    })

    expect(created!.id).toBe("s-new")
    expect(result.current.sessions[0].id).toBe("s-new")
    expect(mockPush).toHaveBeenCalledWith("/w/w1/chat/s-new")
  })
})
