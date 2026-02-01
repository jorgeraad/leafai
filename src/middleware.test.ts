import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";

// Mock updateSession
const mockGetUser = vi.fn();
const mockFrom = vi.fn();

vi.mock("@/lib/supabase/middleware", () => ({
  updateSession: vi.fn(async (request: NextRequest) => {
    const response = NextResponse.next({ request });
    const supabase = {
      auth: { getUser: mockGetUser },
      from: mockFrom,
    };
    const { data: { user } } = await mockGetUser();
    return { supabase, user, response };
  }),
}));

// Import after mock setup
const { middleware } = await import("./middleware");

function makeRequest(path: string): NextRequest {
  return new NextRequest(new URL(path, "http://localhost:3000"));
}

describe("middleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects /w/123 to /login when not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

    const response = await middleware(makeRequest("/w/123"));
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/login"
    );
    expect(response.status).toBe(307);
  });

  it("allows /w/123 when authenticated", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });

    const response = await middleware(makeRequest("/w/123"));
    expect(response.headers.get("location")).toBeNull();
    expect(response.status).toBe(200);
  });

  it("allows /login when not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

    const response = await middleware(makeRequest("/login"));
    expect(response.headers.get("location")).toBeNull();
    expect(response.status).toBe(200);
  });

  it("redirects /login to workspace when authenticated", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });

    const mockQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { workspace_id: "ws-abc" },
        error: null,
      }),
    };
    mockFrom.mockReturnValue(mockQuery);

    const response = await middleware(makeRequest("/login"));
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/w/ws-abc"
    );
    expect(response.status).toBe(307);
  });

  it("allows /api/chat through without auth check redirect", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

    const response = await middleware(makeRequest("/api/chat"));
    expect(response.headers.get("location")).toBeNull();
    expect(response.status).toBe(200);
  });

  it("allows /auth/callback through", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

    const response = await middleware(makeRequest("/auth/callback"));
    expect(response.headers.get("location")).toBeNull();
    expect(response.status).toBe(200);
  });
});
